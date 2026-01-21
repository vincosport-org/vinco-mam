/**
 * Validation Reassign API Handler
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const VALIDATION_TABLE = process.env.VALIDATION_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // All authenticated users can reassign validation items
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

    const body = JSON.parse(event.body || '{}');
    if (!body.assignedTo) {
      return auth.createErrorResponse(400, 'Missing assignedTo in request body', 'BAD_REQUEST');
    }

    // Update queue item assignment
    const updatedItem = await db.updateItem(VALIDATION_TABLE, { queueItemId }, {
      assignedTo: body.assignedTo,
      reassignedBy: user.userId,
      reassignedAt: new Date().toISOString(),
      notes: body.notes || queueItem.notes,
    });

    return auth.createResponse(200, {
      queueItem: updatedItem,
    });
  } catch (error) {
    console.error('Error reassigning queue item:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
