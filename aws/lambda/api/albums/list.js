/**
 * Albums List API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const ALBUMS_TABLE = process.env.ALBUMS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    const result = await db.scan(ALBUMS_TABLE, null, null, limit);

    // Sort by created date descending
    const albums = (result.items || []).sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    // Pagination
    const total = albums.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAlbums = albums.slice(startIndex, endIndex);

    return auth.createResponse(200, {
      albums: paginatedAlbums,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: !!result.lastEvaluatedKey || endIndex < total,
    });
  } catch (error) {
    console.error('Error listing albums:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
