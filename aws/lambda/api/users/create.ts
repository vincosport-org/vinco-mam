import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Users are stored in WordPress, so this proxies to WordPress plugin
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only admins can create users
    if (!user.capabilities?.includes('manageUsers')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.username || !body.email) {
      return auth.createErrorResponse(400, 'Username and email are required', 'VALIDATION_ERROR');
    }

    // This endpoint should be proxied to WordPress plugin
    return auth.createResponse(201, {
      message: 'This endpoint should be proxied to WordPress plugin',
      user: {
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: body.username,
        email: body.email,
        displayName: body.displayName || body.username,
        roles: body.roles || ['subscriber'],
        capabilities: [],
      },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
