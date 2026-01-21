/**
 * Albums Get API Handler
 * Returns a single album by ID with optional public access
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const ALBUMS_TABLE = process.env.ALBUMS_TABLE;

exports.handler = async (event) => {
  try {
    const albumId = event.pathParameters?.albumId;
    if (!albumId) {
      return auth.createErrorResponse(400, 'Missing albumId parameter', 'BAD_REQUEST');
    }

    const queryParams = event.queryStringParameters || {};
    const isPublicRequest = queryParams.public === 'true';

    // For public requests, no auth required but album must be public
    // For authenticated requests, user can see any album
    let user = null;
    if (!isPublicRequest) {
      user = auth.getUserFromRequest(event);
      if (!user) {
        return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
      }
    }

    const album = await db.getItem(ALBUMS_TABLE, { albumId });
    if (!album) {
      return auth.createErrorResponse(404, 'Album not found', 'NOT_FOUND');
    }

    // For public requests, check if album is public
    if (isPublicRequest && !album.isPublic) {
      return auth.createErrorResponse(403, 'Album is not public', 'FORBIDDEN');
    }

    return auth.createResponse(200, {
      album,
    });
  } catch (error) {
    console.error('Error getting album:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
