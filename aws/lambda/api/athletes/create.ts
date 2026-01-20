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

    // Check permissions - only admins/content managers can create athletes
    if (!user.capabilities?.includes('manageAthletes')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.name) {
      return auth.createErrorResponse(400, 'Name is required', 'VALIDATION_ERROR');
    }

    // This endpoint should be proxied to WordPress plugin
    // The WordPress plugin handles the actual database insertion
    return auth.createResponse(201, {
      message: 'This endpoint should be proxied to WordPress plugin',
      athlete: {
        athleteId: `ath_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name,
        nationality: body.nationality || null,
        dateOfBirth: body.dateOfBirth || null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating athlete:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
