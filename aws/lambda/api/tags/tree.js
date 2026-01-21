/**
 * Tags Tree API Handler
 * Returns the full tag hierarchy as a tree structure
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
    const tagType = queryParams.tagType;
    const includeInactive = queryParams.includeInactive === 'true';
    const maxDepth = queryParams.maxDepth ? parseInt(queryParams.maxDepth) : null;

    // Fetch all tags (or filter by type)
    let result;
    if (tagType) {
      result = await db.query(
        TAGS_TABLE,
        'tagType = :type',
        { ':type': tagType },
        'type-index',
        1000
      );
    } else {
      result = await db.scan(TAGS_TABLE, null, null, 1000);
    }

    let tags = result.items || [];

    // Filter inactive if needed
    if (!includeInactive) {
      tags = tags.filter(t => t.isActive !== false);
    }

    // Filter by max depth if specified
    if (maxDepth !== null) {
      tags = tags.filter(t => (t.depth || 0) <= maxDepth);
    }

    // Build tree structure
    const tree = buildTree(tags);

    return auth.createResponse(200, {
      tree,
      totalTags: tags.length,
    });
  } catch (error) {
    console.error('Error getting tag tree:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};

/**
 * Build a tree structure from flat tag list
 */
function buildTree(tags) {
  // Create a map for quick lookup
  const tagMap = {};
  tags.forEach(tag => {
    tagMap[tag.tagId] = {
      ...tag,
      children: [],
    };
  });

  // Build tree by linking children to parents
  const roots = [];
  tags.forEach(tag => {
    const node = tagMap[tag.tagId];
    if (!tag.parentTagId || tag.parentTagId === 'ROOT') {
      roots.push(node);
    } else if (tagMap[tag.parentTagId]) {
      tagMap[tag.parentTagId].children.push(node);
    } else {
      // Orphaned tag (parent not in result set) - treat as root
      roots.push(node);
    }
  });

  // Sort children by sortOrder at each level
  const sortChildren = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);

  // Transform to clean output format
  const transformNode = (node) => ({
    tagId: node.tagId,
    name: node.name,
    slug: node.slug,
    description: node.description,
    tagType: node.tagType,
    color: node.color,
    icon: node.icon,
    depth: node.depth,
    sortOrder: node.sortOrder,
    imageCount: node.imageCount || 0,
    childCount: node.childCount || 0,
    metadata: node.metadata,
    children: node.children.map(transformNode),
  });

  return roots.map(transformNode);
}
