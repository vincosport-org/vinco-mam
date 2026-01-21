/**
 * Validation Claim API Handler
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

    // All authenticated users can claim validation items
    if (!auth.hasPermission(user, 'VIEWER')) {
      return auth.createErrorResponse(403, 'Insufficient permissions', 'FORBIDDEN');
    }

    const queueItemId = event.pathParameters?.queueItemId;
    if (!queueItemId) {
      return auth.createErrorResponse(400, 'Missing queueItemId parameter', 'BAD_REQUEST');
    }

    // Get existing queue item
    const queueItem = await db.getItem(VALIDATION_TABLE, { queueItemId });
    if (!queueItem) {
      return auth.createErrorResponse(404, 'Queue item not found', 'NOT_FOUND');
    }

    // Check if already claimed
    if (queueItem.status === 'CLAIMED' && queueItem.claimedBy !== user.userId) {
      return auth.createErrorResponse(409, 'Item already claimed by another user', 'CONFLICT');
    }

    // Claim the item (auto-release after 5 minutes)
    const now = new Date().toISOString();
    const claimedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.updateItem(
      VALIDATION_TABLE,
      { queueItemId },
      {
        status: 'CLAIMED',
        claimedBy: user.userId,
        claimedAt: now,
        // Auto-release after 5 minutes (would need a separate cleanup job)
      }
    );

    return auth.createResponse(200, {
      success: true,
      claimedUntil,
      queueItemId,
    });
  } catch (error) {
    console.error('Error claiming validation item:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
