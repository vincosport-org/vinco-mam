/**
 * Validation Queue API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const VALIDATION_TABLE = process.env.VALIDATION_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // All authenticated users can view and process the validation queue
    if (!auth.hasPermission(user, 'VIEWER')) {
      return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status || 'PENDING';
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    // Query by status using GSI
    const result = await db.query(
      VALIDATION_TABLE,
      '#status = :status',
      {
        ':status': status,
      },
      'status-createdAt-index',
      limit
    );

    const items = (result.items || []).sort((a, b) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );

    // Pagination
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = items.slice(startIndex, endIndex);

    return auth.createResponse(200, {
      items: paginatedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: !!result.lastEvaluatedKey || endIndex < total,
    });
  } catch (error) {
    console.error('Error getting validation queue:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
