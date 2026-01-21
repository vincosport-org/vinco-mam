/**
 * Validation Reject API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const VALIDATION_TABLE = process.env.VALIDATION_TABLE;
const IMAGES_TABLE = process.env.IMAGES_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // All authenticated users can reject validation items
    if (!auth.hasPermission(user, 'VIEWER')) {
      return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    const queueItemId = event.pathParameters?.queueItemId;
    if (!queueItemId) {
      return auth.createErrorResponse(400, 'Missing queueItemId parameter', 'BAD_REQUEST');
    }

    const queueItem = await db.getItem(VALIDATION_TABLE, { queueItemId });
    if (!queueItem) {
      return auth.createErrorResponse(404, 'Queue item not found', 'NOT_FOUND');
    }

    if (queueItem.status !== 'PENDING') {
      return auth.createErrorResponse(400, 'Item is not pending approval', 'BAD_REQUEST');
    }

    const body = JSON.parse(event.body || '{}');
    if (!body.reason) {
      return auth.createErrorResponse(400, 'Missing reason in request body', 'BAD_REQUEST');
    }

    // Update queue item status
    const updatedItem = await db.updateItem(VALIDATION_TABLE, { queueItemId }, {
      status: 'REJECTED',
      rejectedBy: user.userId,
      rejectedByName: user.name || user.email,
      rejectedAt: new Date().toISOString(),
      rejectionReason: body.reason,
      notes: body.notes || queueItem.notes,
    });

    // Update image recognition status
    if (queueItem.imageId) {
      await db.updateItem(IMAGES_TABLE, { imageId: queueItem.imageId }, {
        recognitionStatus: 'REJECTED',
      });
    }

    return auth.createResponse(200, {
      queueItem: updatedItem,
    });
  } catch (error) {
    console.error('Error rejecting queue item:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
