import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';
import * as db from '../../../shared/nodejs/dynamodb';

const IMAGES_TABLE = process.env.IMAGES_TABLE!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const page = parseInt(queryParams.page || '1');
    const limit = Math.min(parseInt(queryParams.limit || '50'), 200);

    // Filter for videos (mimeType starts with 'video/')
    const result = await db.scan(
      IMAGES_TABLE,
      'begins_with(mimeType, :video)',
      { ':video': 'video/' },
      limit
    );

    const videos = (result.items || []).sort((a, b) => 
      (b.uploadTime || '').localeCompare(a.uploadTime || '')
    );

    // Pagination
    const total = videos.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVideos = videos.slice(startIndex, endIndex);

    return auth.createResponse(200, {
      videos: paginatedVideos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: !!result.lastEvaluatedKey || endIndex < total,
    });
  } catch (error: any) {
    console.error('Error listing videos:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
