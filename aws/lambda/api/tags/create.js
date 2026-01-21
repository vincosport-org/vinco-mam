/**
 * Tags Create API Handler
 * Create a new tag in the hierarchical taxonomy
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const TAGS_TABLE = process.env.TAGS_TABLE;

/**
 * Generate a unique tag ID
 */
function generateTagId() {
  return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a URL-friendly slug from name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    // Check permissions - only content team and above can create tags
    if (!auth.hasPermission(user, 'CONTENT_TEAM')) {
      return auth.createErrorResponse(403, 'Forbidden', 'FORBIDDEN');
    }

    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.name) {
      return auth.createErrorResponse(400, 'Tag name is required', 'VALIDATION_ERROR');
    }

    const now = new Date().toISOString();
    const tagId = generateTagId();
    const parentTagId = body.parentTagId || 'ROOT';

    // If parent is specified, verify it exists and get full path
    let path = [];
    let depth = 0;
    if (parentTagId !== 'ROOT') {
      const parent = await db.getItem(TAGS_TABLE, { tagId: parentTagId });
      if (!parent) {
        return auth.createErrorResponse(404, 'Parent tag not found', 'NOT_FOUND');
      }
      path = [...(parent.path || []), parentTagId];
      depth = (parent.depth || 0) + 1;

      // Update parent's child count
      await db.updateItem(TAGS_TABLE, { tagId: parentTagId }, {
        childCount: (parent.childCount || 0) + 1,
      });
    }

    // Get next sort order for this parent
    const siblings = await db.query(
      TAGS_TABLE,
      'parentTagId = :pid',
      { ':pid': parentTagId },
      'parent-index',
      1000
    );
    const maxSortOrder = siblings.items.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0);

    // Build the tag record
    const tag = {
      tagId,
      name: body.name,
      slug: body.slug || generateSlug(body.name),
      description: body.description || null,
      parentTagId,
      path, // Array of ancestor tag IDs for efficient querying
      depth, // Nesting level (0 = root)
      tagType: body.tagType || 'CATEGORY', // EVENT, LOCATION, CATEGORY, CUSTOM
      color: body.color || null, // Hex color for UI
      icon: body.icon || null, // Icon identifier
      sortOrder: body.sortOrder ?? maxSortOrder + 1,
      imageCount: 0,
      childCount: 0,
      metadata: body.metadata || {}, // Flexible metadata (dates, venue info, etc.)
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
    };

    // Save to DynamoDB
    await db.putItem(TAGS_TABLE, tag);

    return auth.createResponse(201, {
      message: 'Tag created successfully',
      tag: {
        tagId: tag.tagId,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
        parentTagId: tag.parentTagId,
        path: tag.path,
        depth: tag.depth,
        tagType: tag.tagType,
        color: tag.color,
        sortOrder: tag.sortOrder,
        createdAt: tag.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
