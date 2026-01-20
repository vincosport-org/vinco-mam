import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';

// Headshot uploads should be handled via WordPress or S3 direct upload
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

    // This endpoint should handle multipart form data upload
    // For now, return a response indicating this should be proxied to WordPress
    return auth.createResponse(200, {
      message: 'This endpoint should be proxied to WordPress plugin or handle S3 upload',
      athleteId,
      headshotUrl: `https://s3.amazonaws.com/headshots/${athleteId}.jpg`, // Placeholder
    });
  } catch (error: any) {
    console.error('Error uploading headshot:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
