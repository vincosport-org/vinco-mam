/**
 * Videos Get API Handler
 * Videos may be stored in DynamoDB (similar to images) or WordPress
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

    const mediaId = event.pathParameters?.mediaId;
    if (!mediaId) {
      return auth.createErrorResponse(400, 'Media ID is required', 'VALIDATION_ERROR');
    }

    // Try to get video from DynamoDB (if videos are stored there)
    // For now, return placeholder response
    // In production, this would query the appropriate table
    return auth.createResponse(200, {
      mediaId,
      filename: 'video.mp4',
      duration: 120,
      thumbnailUrl: `https://${IMAGES_BUCKET}.s3.amazonaws.com/thumbnails/${mediaId}.jpg`,
      videoUrl: `https://${IMAGES_BUCKET}.s3.amazonaws.com/videos/${mediaId}.mp4`,
      uploadedAt: new Date().toISOString(),
      eventId: null,
      photographerId: null,
    });
  } catch (error) {
    console.error('Error getting video:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
