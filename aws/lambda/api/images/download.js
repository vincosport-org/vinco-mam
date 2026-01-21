/**
 * Images Download API Handler
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

    // Check permission for original downloads
    const downloadType = event.pathParameters?.type || 'original'; // 'original' or 'export'

    if (downloadType === 'original' && !auth.hasPermission(user, 'ADMIN')) {
      return auth.createErrorResponse(403, 'Insufficient permissions for original download', 'FORBIDDEN');
    }

    const imageId = event.pathParameters?.imageId;
    if (!imageId) {
      return auth.createErrorResponse(400, 'Missing imageId parameter', 'BAD_REQUEST');
    }

    // Get image
    const image = await db.getItem(IMAGES_TABLE, { imageId });
    if (!image) {
      return auth.createErrorResponse(404, 'Image not found', 'NOT_FOUND');
    }

    // Determine which S3 key to use
    let s3Key;
    if (downloadType === 'original') {
      s3Key = image.originalKey;
    } else {
      s3Key = image.proxyKey || image.originalKey;
    }

    if (!s3Key) {
      return auth.createErrorResponse(404, 'Image file not found', 'NOT_FOUND');
    }

    // Generate pre-signed URL (longer expiry for downloads)
    const downloadUrl = await s3.getPresignedUrl(IMAGES_BUCKET, s3Key, 3600); // 1 hour

    // Return redirect to pre-signed URL
    return {
      statusCode: 302,
      headers: {
        Location: downloadUrl,
      },
      body: '',
    };
  } catch (error) {
    console.error('Error generating download URL:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
