/**
 * Tagging Rules Create API Handler
 * Create auto-tagging rules for automatic tag assignment
 *
 * Rule types:
 * - DATE_RANGE: Apply tags to images captured between startDate and endDate
 * - FOLDER_PATH: Apply tags to images uploaded to specific folder patterns
 * - COMBINED: Apply tags when both date and folder conditions match
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const TAGGING_RULES_TABLE = process.env.TAGGING_RULES_TABLE;
const TAGS_TABLE = process.env.TAGS_TABLE;

/**
 * Generate a unique rule ID
 */
function generateRuleId() {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only content team and above can create rules
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.name) {
      return auth.createErrorResponse(400, 'Rule name is required', 'VALIDATION_ERROR');
    }
    if (!body.tagIds || !Array.isArray(body.tagIds) || body.tagIds.length === 0) {
      return auth.createErrorResponse(400, 'At least one tag ID is required', 'VALIDATION_ERROR');
    }
    if (!body.ruleType || !['DATE_RANGE', 'FOLDER_PATH', 'COMBINED'].includes(body.ruleType)) {
      return auth.createErrorResponse(400, 'Valid ruleType is required (DATE_RANGE, FOLDER_PATH, COMBINED)', 'VALIDATION_ERROR');
    }

    // Validate conditions based on rule type
    const conditions = body.conditions || {};
    if (body.ruleType === 'DATE_RANGE' || body.ruleType === 'COMBINED') {
      if (!conditions.startDate || !conditions.endDate) {
        return auth.createErrorResponse(400, 'startDate and endDate are required for DATE_RANGE rules', 'VALIDATION_ERROR');
      }
    }
    if (body.ruleType === 'FOLDER_PATH' || body.ruleType === 'COMBINED') {
      if (!conditions.folderPattern) {
        return auth.createErrorResponse(400, 'folderPattern is required for FOLDER_PATH rules', 'VALIDATION_ERROR');
      }
    }

    // Verify all tags exist
    for (const tagId of body.tagIds) {
      const tag = await db.getItem(TAGS_TABLE, { tagId });
      if (!tag) {
        return auth.createErrorResponse(404, `Tag not found: ${tagId}`, 'NOT_FOUND');
      }
    }

    const now = new Date().toISOString();
    const ruleId = generateRuleId();

    // Build the rule record
    const rule = {
      ruleId,
      name: body.name,
      description: body.description || null,
      ruleType: body.ruleType,
      conditions: {
        startDate: conditions.startDate || null,
        endDate: conditions.endDate || null,
        folderPattern: conditions.folderPattern || null, // e.g., "events/2025/weltklasse/*"
        eventId: conditions.eventId || null, // Optional: link to specific event
      },
      tagIds: body.tagIds, // Tags to apply when rule matches
      priority: body.priority ?? 100, // Lower number = higher priority
      isActive: body.isActive !== false ? 'true' : 'false', // String for GSI
      applyToExisting: body.applyToExisting || false, // Whether to retroactively apply
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
    };

    // Save to DynamoDB
    await db.putItem(TAGGING_RULES_TABLE, rule);

    return auth.createResponse(201, {
      message: 'Tagging rule created successfully',
      rule: {
        ruleId: rule.ruleId,
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType,
        conditions: rule.conditions,
        tagIds: rule.tagIds,
        priority: rule.priority,
        isActive: rule.isActive === 'true',
        createdAt: rule.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating tagging rule:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
