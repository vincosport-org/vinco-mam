/**
 * Images Get API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');
const s3 = require('/opt/nodejs/s3');

const IMAGES_TABLE = process.env.IMAGES_TABLE;
const IMAGES_BUCKET = process.env.IMAGES_BUCKET;

exports.handler = async (event) => {
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
    const signedUrls = {};

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
  } catch (error) {
    console.error('Error getting image:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
