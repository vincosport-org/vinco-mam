/**
 * Tagging Rules List API Handler
 * List auto-tagging rules for automatic tag assignment
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

    const queryParams = event.queryStringParameters || {};
    const { isActive, limit: limitStr } = queryParams;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    let result;

    if (isActive === 'true') {
      // Query only active rules using GSI
      result = await db.query(
        TAGGING_RULES_TABLE,
        'isActive = :active',
        { ':active': 'true' },
        'active-rules-index',
        limit
      );
    } else {
      // Scan all rules
      result = await db.scan(TAGGING_RULES_TABLE, null, null, limit);
    }

    // Sort by priority (lower number = higher priority)
    const rules = (result.items || []).sort((a, b) => (a.priority || 100) - (b.priority || 100));

    // Transform for response
    const transformedRules = rules.map(r => ({
      ruleId: r.ruleId,
      name: r.name,
      description: r.description,
      ruleType: r.ruleType, // DATE_RANGE, FOLDER_PATH, COMBINED
      conditions: r.conditions,
      tagIds: r.tagIds,
      priority: r.priority,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return auth.createResponse(200, {
      rules: transformedRules,
      total: transformedRules.length,
    });
  } catch (error) {
    console.error('Error listing tagging rules:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
