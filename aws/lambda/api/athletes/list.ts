import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Athletes are stored in WordPress MySQL, so this is a proxy endpoint
// The actual query will be handled by the WordPress plugin via API Gateway
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // This endpoint proxies to WordPress plugin
    // The WordPress plugin handles the actual database query
    // We just pass through the request
    
    const queryParams = event.queryStringParameters || {};
    
    // Return a response indicating this should be proxied to WordPress
    return auth.createResponse(200, {
      message: 'This endpoint should be proxied to WordPress plugin',
      queryParams,
    });
  } catch (error: any) {
    console.error('Error listing athletes:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
