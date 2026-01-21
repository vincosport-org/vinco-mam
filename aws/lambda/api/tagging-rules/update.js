/**
 * Tagging Rules Update API Handler
 * Update an existing auto-tagging rule
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const TAGGING_RULES_TABLE = process.env.TAGGING_RULES_TABLE;
const TAGS_TABLE = process.env.TAGS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only content team and above can update rules
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

    const body = JSON.parse(event.body || '{}');
    const now = new Date().toISOString();

    // Build update object with allowed fields
    const updates = {
      updatedAt: now,
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.isActive !== undefined) updates.isActive = body.isActive ? 'true' : 'false';

    // Update conditions
    if (body.conditions !== undefined) {
      const newConditions = { ...existingRule.conditions };
      if (body.conditions.startDate !== undefined) newConditions.startDate = body.conditions.startDate;
      if (body.conditions.endDate !== undefined) newConditions.endDate = body.conditions.endDate;
      if (body.conditions.folderPattern !== undefined) newConditions.folderPattern = body.conditions.folderPattern;
      if (body.conditions.eventId !== undefined) newConditions.eventId = body.conditions.eventId;
      updates.conditions = newConditions;
    }

    // Update tags (verify they exist)
    if (body.tagIds !== undefined) {
      if (!Array.isArray(body.tagIds) || body.tagIds.length === 0) {
        return auth.createErrorResponse(400, 'At least one tag ID is required', 'VALIDATION_ERROR');
      }
      for (const tagId of body.tagIds) {
        const tag = await db.getItem(TAGS_TABLE, { tagId });
        if (!tag) {
          return auth.createErrorResponse(404, `Tag not found: ${tagId}`, 'NOT_FOUND');
        }
      }
      updates.tagIds = body.tagIds;
    }

    // Update rule type (with validation)
    if (body.ruleType !== undefined) {
      if (!['DATE_RANGE', 'FOLDER_PATH', 'COMBINED'].includes(body.ruleType)) {
        return auth.createErrorResponse(400, 'Invalid ruleType', 'VALIDATION_ERROR');
      }
      updates.ruleType = body.ruleType;
    }

    const updatedRule = await db.updateItem(TAGGING_RULES_TABLE, { ruleId }, updates);

    return auth.createResponse(200, {
      message: 'Tagging rule updated successfully',
      rule: {
        ruleId: updatedRule.ruleId,
        name: updatedRule.name,
        description: updatedRule.description,
        ruleType: updatedRule.ruleType,
        conditions: updatedRule.conditions,
        tagIds: updatedRule.tagIds,
        priority: updatedRule.priority,
        isActive: updatedRule.isActive === 'true',
        updatedAt: updatedRule.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating tagging rule:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
