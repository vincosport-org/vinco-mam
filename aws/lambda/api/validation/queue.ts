import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';
import * as db from '../../../shared/nodejs/dynamodb';

const VALIDATION_TABLE = process.env.VALIDATION_TABLE!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (!auth.hasPermission(user, 'EDITOR')) {
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
  } catch (error: any) {
    console.error('Error getting validation queue:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
