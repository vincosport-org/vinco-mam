/**
 * Tags Update API Handler
 * Update an existing tag
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

    // Check permissions - only content team and above can update tags
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

    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();

    // Build update object with allowed fields
    const updates = {
      updatedAt: now,
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.description !== undefined) updates.description = body.description;
    if (body.tagType !== undefined) updates.tagType = body.tagType;
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    // Handle parent change (reparenting)
    if (body.parentTagId !== undefined && body.parentTagId !== existingTag.parentTagId) {
      const newParentTagId = body.parentTagId || 'ROOT';

      // Verify new parent exists (if not ROOT)
      let newPath = [];
      let newDepth = 0;
      if (newParentTagId !== 'ROOT') {
        const newParent = await db.getItem(TAGS_TABLE, { tagId: newParentTagId });
        if (!newParent) {
          return auth.createErrorResponse(404, 'New parent tag not found', 'NOT_FOUND');
        }
        // Prevent circular reference
        if (newParent.path && newParent.path.includes(tagId)) {
          return auth.createErrorResponse(400, 'Cannot move tag under its own descendant', 'VALIDATION_ERROR');
        }
        newPath = [...(newParent.path || []), newParentTagId];
        newDepth = (newParent.depth || 0) + 1;

        // Update new parent's child count
        await db.updateItem(TAGS_TABLE, { tagId: newParentTagId }, {
          childCount: (newParent.childCount || 0) + 1,
        });
      }

      // Decrement old parent's child count
      if (existingTag.parentTagId && existingTag.parentTagId !== 'ROOT') {
        const oldParent = await db.getItem(TAGS_TABLE, { tagId: existingTag.parentTagId });
        if (oldParent) {
          await db.updateItem(TAGS_TABLE, { tagId: existingTag.parentTagId }, {
            childCount: Math.max(0, (oldParent.childCount || 1) - 1),
          });
        }
      }

      updates.parentTagId = newParentTagId;
      updates.path = newPath;
      updates.depth = newDepth;

      // TODO: Update all descendant paths recursively (complex operation)
      // For now, this only updates the immediate tag
    }

    const updatedTag = await db.updateItem(TAGS_TABLE, { tagId }, updates);

    return auth.createResponse(200, {
      message: 'Tag updated successfully',
      tag: {
        tagId: updatedTag.tagId,
        name: updatedTag.name,
        slug: updatedTag.slug,
        description: updatedTag.description,
        parentTagId: updatedTag.parentTagId,
        path: updatedTag.path,
        depth: updatedTag.depth,
        tagType: updatedTag.tagType,
        color: updatedTag.color,
        sortOrder: updatedTag.sortOrder,
        isActive: updatedTag.isActive,
        updatedAt: updatedTag.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
