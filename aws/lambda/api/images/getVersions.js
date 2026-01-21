/**
 * Images Get Versions API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const EDIT_VERSIONS_TABLE = process.env.EDIT_VERSIONS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const imageId = event.pathParameters?.imageId;
    if (!imageId) {
      return auth.createErrorResponse(400, 'Missing imageId parameter', 'BAD_REQUEST');
    }

    // Query all versions for this image
    const result = await db.query(
      EDIT_VERSIONS_TABLE,
      'imageId = :imageId',
      { ':imageId': imageId }
    );

    // Sort by timestamp descending
    const versions = result.items.sort((a, b) =>
      b.versionTimestamp.localeCompare(a.versionTimestamp)
    );

    return auth.createResponse(200, {
      versions: versions.map(v => ({
        versionTimestamp: v.versionTimestamp,
        userId: v.userId,
        userName: v.userName,
        edits: v.edits,
      })),
    });
  } catch (error) {
    console.error('Error getting versions:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
