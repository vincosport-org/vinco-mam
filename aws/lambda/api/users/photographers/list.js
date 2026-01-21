/**
 * Photographers List API Handler
 * Photographers are now stored in DynamoDB
 */
const auth = require('/opt/nodejs/auth');
const db = require('/opt/nodejs/dynamodb');

const PHOTOGRAPHERS_TABLE = process.env.PHOTOGRAPHERS_TABLE;

exports.handler = async (event) => {
  try {
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized', 'UNAUTHORIZED');
    }

    const queryParams = event.queryStringParameters || {};
    const { limit: limitStr, lastKey } = queryParams;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const exclusiveStartKey = lastKey ? JSON.parse(decodeURIComponent(lastKey)) : null;

    // Scan photographers table
    const result = await db.scan(
      PHOTOGRAPHERS_TABLE,
      null,
      null,
      limit,
      exclusiveStartKey
    );

    // Transform photographers for response
    const photographers = result.items.map(p => ({
      photographerId: p.photographerId,
      wpUserId: p.wpUserId,
      displayName: p.displayName,
      email: p.email,
      ftpUsername: p.ftpUsername,
      ftpFolderPath: p.ftpFolderPath,
      defaultCopyright: p.defaultCopyright,
      defaultCredit: p.defaultCredit,
      totalUploads: p.totalUploads || 0,
      active: p.active !== false,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return auth.createResponse(200, {
      photographers,
      pagination: {
        limit,
        hasMore: !!result.lastEvaluatedKey,
        lastKey: result.lastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
          : null,
      },
    });
  } catch (error) {
    console.error('Error listing photographers:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
