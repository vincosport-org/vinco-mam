import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';
import * as db from '../../../shared/nodejs/dynamodb';

const ALBUMS_TABLE = process.env.ALBUMS_TABLE!;

interface UpdateAlbumRequest {
  title?: string;
  description?: string;
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

    const albumId = event.pathParameters?.albumId;
    if (!albumId) {
      return auth.createErrorResponse(400, 'Missing albumId parameter', 'BAD_REQUEST');
    }

    const album = await db.getItem(ALBUMS_TABLE, { albumId });
    if (!album) {
      return auth.createErrorResponse(404, 'Album not found', 'NOT_FOUND');
    }

    const body = JSON.parse(event.body || '{}') as UpdateAlbumRequest;

    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    if (body.coverImageId !== undefined) updates.coverImageId = body.coverImageId;

    const updatedAlbum = await db.updateItem(ALBUMS_TABLE, { albumId }, updates);

    return auth.createResponse(200, {
      album: updatedAlbum,
    });
  } catch (error: any) {
    console.error('Error updating album:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
