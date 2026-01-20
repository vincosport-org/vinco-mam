import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as auth from '../../../shared/nodejs/auth';
import * as db from '../../../shared/nodejs/dynamodb';
import * as s3 from '../../../shared/nodejs/s3';

const IMAGES_TABLE = process.env.IMAGES_TABLE!;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const imageId = event.pathParameters?.imageId;
    if (!imageId) {
      return auth.createErrorResponse(400, 'Missing imageId parameter', 'BAD_REQUEST');
    }

    // Get image from DynamoDB
    const image = await db.getItem(IMAGES_TABLE, { imageId });
    if (!image) {
      return auth.createErrorResponse(404, 'Image not found', 'NOT_FOUND');
    }

    // Generate pre-signed URLs
    const signedUrls: any = {};
    
    if (image.originalKey) {
      signedUrls.original = await s3.getPresignedUrl(IMAGES_BUCKET, image.originalKey, 3600);
    }
    if (image.proxyKey) {
      signedUrls.proxy = await s3.getPresignedUrl(IMAGES_BUCKET, image.proxyKey, 3600);
    }
    if (image.thumbnailKey) {
      signedUrls.thumbnail = await s3.getPresignedUrl(IMAGES_BUCKET, image.thumbnailKey, 3600);
    }

    // Get recognized athletes with details
    const recognizedAthletes = image.recognizedAthletes || [];

    return auth.createResponse(200, {
      image,
      signedUrls,
      recognizedAthletes,
    });
  } catch (error: any) {
    console.error('Error getting image:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
