/**
 * Albums Add Images API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const ALBUMS_TABLE = process.env.ALBUMS_TABLE;
const IMAGES_TABLE = process.env.IMAGES_TABLE;

exports.handler = async (event) => {
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

    const body = JSON.parse(event.body || '{}');
    if (!body.imageIds || !Array.isArray(body.imageIds) || body.imageIds.length === 0) {
      return auth.createErrorResponse(400, 'Missing or empty imageIds array', 'BAD_REQUEST');
    }

    // Verify all images exist
    const existingImageIds = album.imageIds || [];
    const newImageIds = [];

    for (const imageId of body.imageIds) {
      const image = await db.getItem(IMAGES_TABLE, { imageId });
      if (image && !existingImageIds.includes(imageId)) {
        newImageIds.push(imageId);
      }
    }

    if (newImageIds.length === 0) {
      return auth.createResponse(200, {
        album,
        added: 0,
        skipped: body.imageIds.length,
      });
    }

    // Update album with new image IDs
    const updatedImageIds = [...existingImageIds, ...newImageIds];
    const updatedAlbum = await db.updateItem(ALBUMS_TABLE, { albumId }, {
      imageIds: updatedImageIds,
      imageCount: updatedImageIds.length,
    });

    return auth.createResponse(200, {
      album: updatedAlbum,
      added: newImageIds.length,
      skipped: body.imageIds.length - newImageIds.length,
    });
  } catch (error) {
    console.error('Error adding images to album:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
