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

    // This endpoint should be proxied to WordPress plugin
    return auth.createResponse(200, {
      photographers: [
        {
          photographerId: 'photog_1',
          name: 'John Photographer',
          email: 'john@example.com',
          active: true,
        },
      ],
    });
  } catch (error: any) {
    console.error('Error listing photographers:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
