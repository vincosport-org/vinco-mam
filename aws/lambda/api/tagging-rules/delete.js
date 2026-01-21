/**
 * Tagging Rules Delete API Handler
 * Delete a tagging rule
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const TAGGING_RULES_TABLE = process.env.TAGGING_RULES_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only content team and above can delete rules
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const ruleId = event.pathParameters?.ruleId;
    if (!ruleId) {
      return auth.createErrorResponse(400, 'Rule ID is required', 'VALIDATION_ERROR');
    }

    const existingRule = await db.getItem(TAGGING_RULES_TABLE, { ruleId });
    if (!existingRule) {
      return auth.createErrorResponse(404, 'Tagging rule not found', 'NOT_FOUND');
    }

    // Delete the rule
    await db.deleteItem(TAGGING_RULES_TABLE, { ruleId });

    return auth.createResponse(200, {
      message: 'Tagging rule deleted successfully',
      ruleId,
    });
  } catch (error) {
    console.error('Error deleting tagging rule:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
