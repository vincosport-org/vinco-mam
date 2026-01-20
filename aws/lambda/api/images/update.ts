import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';
import * as db from '../../../shared/nodejs/dynamodb';

const IMAGES_TABLE = process.env.IMAGES_TABLE!;

interface UpdateImageRequest {
  title?: string;
  description?: string;
  keywords?: string[];
  eventId?: string;
  venueId?: string;
  starred?: boolean;
  rating?: number;
  priority?: 'NORMAL' | 'URGENT';
}

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

    const imageId = event.pathParameters?.imageId;
    if (!imageId) {
      return auth.createErrorResponse(400, 'Missing imageId parameter', 'BAD_REQUEST');
    }

    const body = JSON.parse(event.body || '{}') as UpdateImageRequest;

    // Get existing image
    const existingImage = await db.getItem(IMAGES_TABLE, { imageId });
    if (!existingImage) {
      return auth.createErrorResponse(404, 'Image not found', 'NOT_FOUND');
    }

    // Prepare updates
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.keywords !== undefined) updates.keywords = body.keywords;
    if (body.eventId !== undefined) updates.eventId = body.eventId;
    if (body.venueId !== undefined) updates.venueId = body.venueId;
    if (body.starred !== undefined) updates.starred = body.starred;
    if (body.rating !== undefined) updates.rating = body.rating;
    if (body.priority !== undefined) updates.priority = body.priority;

    // Update image
    const updatedImage = await db.updateItem(IMAGES_TABLE, { imageId }, updates);

    return auth.createResponse(200, {
      image: updatedImage,
    });
  } catch (error: any) {
    console.error('Error updating image:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
