import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Athletes are stored in WordPress MySQL, so this proxies to WordPress plugin
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions
    if (!user.capabilities?.includes('manageAthletes')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const athleteId = event.pathParameters?.athleteId;
    if (!athleteId) {
      return auth.createErrorResponse(400, 'Athlete ID is required', 'VALIDATION_ERROR');
    }

    const body = JSON.parse(event.body || '{}');

    // This endpoint should be proxied to WordPress plugin
    return auth.createResponse(200, {
      message: 'This endpoint should be proxied to WordPress plugin',
      athleteId,
      updates: body,
    });
  } catch (error: any) {
    console.error('Error updating athlete:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
