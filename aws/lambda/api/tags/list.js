/**
 * Tags List API Handler
 * List tags with optional filtering by type or parent
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const TAGS_TABLE = process.env.TAGS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const { parentTagId, tagType, limit: limitStr, lastKey } = queryParams;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    const exclusiveStartKey = lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null;

    let result;

    if (parentTagId) {
      // Query children of a specific parent
      result = await db.query(
        TAGS_TABLE,
        'parentTagId = :pid',
        { ':pid': parentTagId },
        'parent-index',
        limit,
        exclusiveStartKey
      );
    } else if (tagType) {
      // Query by tag type (e.g., 'EVENT', 'LOCATION', 'CATEGORY')
      result = await db.query(
        TAGS_TABLE,
        'tagType = :type',
        { ':type': tagType },
        'type-index',
        limit,
        exclusiveStartKey
      );
    } else {
      // Get root-level tags (parentTagId = 'ROOT')
      result = await db.query(
        TAGS_TABLE,
        'parentTagId = :pid',
        { ':pid': 'ROOT' },
        'parent-index',
        limit,
        exclusiveStartKey
      );
    }

    // Sort by sortOrder
    const tags = result.items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return auth.createResponse(200, {
      tags: tags.map(tag => ({
        tagId: tag.tagId,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
        parentTagId: tag.parentTagId,
        tagType: tag.tagType,
        color: tag.color,
        icon: tag.icon,
        sortOrder: tag.sortOrder,
        imageCount: tag.imageCount || 0,
        childCount: tag.childCount || 0,
        metadata: tag.metadata,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt,
      })),
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        lastKey: result.lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
          : null,
      },
    });
  } catch (error) {
    console.error('Error listing tags:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
