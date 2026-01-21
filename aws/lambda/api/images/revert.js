/**
 * Images Revert API Handler
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
    const versionTimestamp = event.pathParameters?.versionTimestamp;

    if (!imageId || !versionTimestamp) {
      return auth.createErrorResponse(400, 'Missing imageId or versionTimestamp parameter', 'BAD_REQUEST');
    }

    // Get the version to revert to
    const version = await db.getItem(EDIT_VERSIONS_TABLE, { imageId, versionTimestamp });
    if (!version) {
      return auth.createErrorResponse(404, 'Version not found', 'NOT_FOUND');
    }

    // Update image with the version's edits
    const updatedImage = await db.updateItem(IMAGES_TABLE, { imageId }, {
      currentEdits: version.edits,
    });

    // Optionally create a new version from the revert
    const revertVersionTimestamp = new Date().toISOString();
    const revertVersion = {
      imageId,
      versionTimestamp: revertVersionTimestamp,
      userId: user.userId,
      userName: user.name || user.email,
      edits: version.edits,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
    };

    await db.putItem(EDIT_VERSIONS_TABLE, revertVersion);

    return auth.createResponse(200, {
      image: updatedImage,
    });
  } catch (error) {
    console.error('Error reverting to version:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
