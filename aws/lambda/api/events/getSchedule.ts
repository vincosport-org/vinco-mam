import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Events are stored in WordPress MySQL, so this proxies to WordPress plugin
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const eventId = event.pathParameters?.eventId;
    if (!eventId) {
      return auth.createErrorResponse(400, 'Event ID is required', 'VALIDATION_ERROR');
    }

    // This endpoint should be proxied to WordPress plugin
    // Return sample schedule data structure
    return auth.createResponse(200, {
      eventId,
      schedule: [
        {
          scheduleId: 'sch_1',
          name: 'Men\'s 100m Final',
          startTime: new Date().toISOString(),
          status: 'upcoming',
        },
        {
          scheduleId: 'sch_2',
          name: 'Women\'s Long Jump',
          startTime: new Date(Date.now() + 3600000).toISOString(),
          status: 'upcoming',
        },
      ],
    });
  } catch (error: any) {
    console.error('Error getting event schedule:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
