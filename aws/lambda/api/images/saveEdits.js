/**
 * Images Save Edits API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const IMAGES_TABLE = process.env.IMAGES_TABLE;
const EDIT_VERSIONS_TABLE = process.env.EDIT_VERSIONS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (!auth.hasPermission(user, 'EDITOR')) {
      return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    const imageId = event.pathParameters?.imageId;
    if (!imageId) {
      return auth.createErrorResponse(400, 'Missing imageId parameter', 'BAD_REQUEST');
    }

    const body = JSON.parse(event.body || '{}');
    if (!body.edits) {
      return auth.createErrorResponse(400, 'Missing edits in request body', 'BAD_REQUEST');
    }

    // Get existing image
    const existingImage = await db.getItem(IMAGES_TABLE, { imageId });
    if (!existingImage) {
      return auth.createErrorResponse(404, 'Image not found', 'NOT_FOUND');
    }

    // Save edit version
    const versionTimestamp = new Date().toISOString();
    const editVersion = {
      imageId,
      versionTimestamp,
      userId: user.userId,
      userName: user.name || user.email,
      edits: body.edits,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
    };

    await db.putItem(EDIT_VERSIONS_TABLE, editVersion);

    // Update image with current edits
    await db.updateItem(IMAGES_TABLE, { imageId }, {
      currentEdits: body.edits,
    });

    // Get version count
    const versionsResult = await db.query(
      EDIT_VERSIONS_TABLE,
      'imageId = :imageId',
      { ':imageId': imageId }
    );
    const versionCount = versionsResult.items.length;

    return auth.createResponse(200, {
      versionTimestamp,
      versionCount,
    });
  } catch (error) {
    console.error('Error saving edits:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
