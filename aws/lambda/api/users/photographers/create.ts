import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Photographers are stored in WordPress MySQL, so this proxies to WordPress plugin
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions
    if (!user.capabilities?.includes('manageUsers')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.name || !body.email) {
      return auth.createErrorResponse(400, 'Name and email are required', 'VALIDATION_ERROR');
    }

    // This endpoint should be proxied to WordPress plugin
    return auth.createResponse(201, {
      message: 'This endpoint should be proxied to WordPress plugin',
      photographer: {
        photographerId: `photog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name,
        email: body.email,
        active: true,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating photographer:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
