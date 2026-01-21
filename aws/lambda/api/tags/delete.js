/**
 * Tags Delete API Handler
 * Soft delete a tag (marks as inactive)
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const TAGS_TABLE = process.env.TAGS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only content team and above can delete tags
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const tagId = event.pathParameters?.tagId;
    if (!tagId) {
      return auth.createErrorResponse(400, 'Tag ID is required', 'VALIDATION_ERROR');
    }

    const existingTag = await db.getItem(TAGS_TABLE, { tagId });
    if (!existingTag) {
      return auth.createErrorResponse(404, 'Tag not found', 'NOT_FOUND');
    }

    // Check if tag has children
    if (existingTag.childCount > 0) {
      return auth.createErrorResponse(400, 'Cannot delete tag with children. Delete or move children first.', 'VALIDATION_ERROR');
    }

    const queryParams = event.queryStringParameters || {};
    const hardDelete = queryParams.hard === 'true';

    if (hardDelete) {
      // Hard delete - remove from database
      await db.deleteItem(TAGS_TABLE, { tagId });

      // Decrement parent's child count
      if (existingTag.parentTagId && existingTag.parentTagId !== 'ROOT') {
        const parent = await db.getItem(TAGS_TABLE, { tagId: existingTag.parentTagId });
        if (parent) {
          await db.updateItem(TAGS_TABLE, { tagId: existingTag.parentTagId }, {
            childCount: Math.max(0, (parent.childCount || 1) - 1),
          });
        }
      }

      return auth.createResponse(200, {
        message: 'Tag permanently deleted',
        tagId,
      });
    } else {
      // Soft delete - mark as inactive
      const now = new Date().toISOString();
      await db.updateItem(TAGS_TABLE, { tagId }, {
        isActive: false,
        deletedAt: now,
        deletedBy: user.userId,
        updatedAt: now,
      });

      return auth.createResponse(200, {
        message: 'Tag deactivated',
        tagId,
      });
    }
  } catch (error) {
    console.error('Error deleting tag:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
