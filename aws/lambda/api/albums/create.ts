import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import * as auth from '../../../shared/nodejs/auth';
import * as db from '../../../shared/nodejs/dynamodb';

const ALBUMS_TABLE = process.env.ALBUMS_TABLE!;

interface CreateAlbumRequest {
  title: string;
  description?: string;
  eventId?: string;
  isPublic?: boolean;
  coverImageId?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}') as CreateAlbumRequest;
    if (!body.title) {
      return auth.createErrorResponse(400, 'Missing title in request body', 'BAD_REQUEST');
    }

    const albumId = randomUUID();
    const now = new Date().toISOString();

    const album = {
      albumId,
      title: body.title,
      description: body.description || '',
      eventId: body.eventId,
      isPublic: body.isPublic || false,
      coverImageId: body.coverImageId,
      createdBy: user.userId,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
      imageIds: [],
      imageCount: 0,
    };

    await db.putItem(ALBUMS_TABLE, album);

    return auth.createResponse(201, {
      album,
    });
  } catch (error: any) {
    console.error('Error creating album:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
