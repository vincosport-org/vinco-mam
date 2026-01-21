/**
 * Albums Create API Handler
 */
const { randomUUID } = require('crypto');
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const ALBUMS_TABLE = process.env.ALBUMS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Allow ADMIN, EDITOR, or CONTENT_TEAM to create albums
    const allowedRoles = ['ADMIN', 'EDITOR', 'CONTENT_TEAM'];
    if (!user.role || !allowedRoles.includes(user.role)) {
      // Fallback: check if user has permission
      if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
        return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
      }
    }

    const body = JSON.parse(event.body || '{}');
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
  } catch (error) {
    console.error('Error creating album:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
