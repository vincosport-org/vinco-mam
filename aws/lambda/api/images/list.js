/**
 * Images List API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const IMAGES_TABLE = process.env.IMAGES_TABLE;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);
    const sortBy = queryParams.sortBy || 'uploadTime';
    const sortOrder = queryParams.sortOrder || 'desc';

    // Build query parameters
    let items = [];
    let lastEvaluatedKey = null;

    // Use GSI if filtering by photographer or event
    if (queryParams.photographerId) {
      const result = await db.query(
        IMAGES_TABLE,
        'photographerId = :photographerId',
        {
          ':photographerId': queryParams.photographerId,
        },
        'photographerId-uploadTime-index',
        limit,
        lastEvaluatedKey
      );
      items = result.items;
      lastEvaluatedKey = result.lastEvaluatedKey;
    } else if (queryParams.eventId) {
      const result = await db.query(
        IMAGES_TABLE,
        'eventId = :eventId',
        {
          ':eventId': queryParams.eventId,
        },
        'eventId-captureTime-index',
        limit,
        lastEvaluatedKey
      );
      items = result.items;
      lastEvaluatedKey = result.lastEvaluatedKey;
    } else {
      // Use scan for general queries
      let filterExpression = null;
      const expressionAttributeValues = {};

      if (queryParams.status) {
        filterExpression = '#status = :status';
        expressionAttributeValues[':status'] = queryParams.status;
      }

      const result = await db.scan(
        IMAGES_TABLE,
        filterExpression,
        Object.keys(expressionAttributeValues).length > 0 ? expressionAttributeValues : null,
        limit,
        lastEvaluatedKey
      );
      items = result.items;
      lastEvaluatedKey = result.lastEvaluatedKey;
    }

    // Apply additional filters
    if (queryParams.starred === 'true') {
      items = items.filter(item => item.starred === true);
    }
    if (queryParams.minRating) {
      const minRating = parseInt(queryParams.minRating);
      items = items.filter(item => (item.rating || 0) >= minRating);
    }
    if (queryParams.recognitionStatus) {
      items = items.filter(item => item.recognitionStatus === queryParams.recognitionStatus);
    }

    // Sort items
    items.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Pagination
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    return auth.createResponse(200, {
      images: paginatedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: !!lastEvaluatedKey || endIndex < total,
    });
  } catch (error) {
    console.error('Error listing images:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
