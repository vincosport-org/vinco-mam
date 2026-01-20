import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Results are stored in WordPress MySQL, so this proxies to WordPress plugin
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const eventId = event.pathParameters?.eventId;
    const scheduleId = event.pathParameters?.scheduleId;
    
    if (!eventId || !scheduleId) {
      return auth.createErrorResponse(400, 'Event ID and Schedule ID are required', 'VALIDATION_ERROR');
    }

    // This endpoint should be proxied to WordPress plugin
    // Return sample results data structure
    return auth.createResponse(200, {
      eventId,
      scheduleId,
      results: [
        {
          position: 1,
          athleteId: 'ath_1',
          athleteName: 'John Doe',
          result: '9.87',
          unit: 'seconds',
        },
        {
          position: 2,
          athleteId: 'ath_2',
          athleteName: 'Jane Smith',
          result: '9.91',
          unit: 'seconds',
        },
      ],
    });
  } catch (error: any) {
    console.error('Error getting results:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
