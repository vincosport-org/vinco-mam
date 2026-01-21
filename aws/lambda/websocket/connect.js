/**
 * WebSocket Connect Handler
 */
const db = require('/opt/nodejs/dynamodb');
const auth = require('/opt/nodejs/auth');

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

exports.handler = async (event, context) => {
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  try {
    // Extract user info from query string or headers
    const queryParams = event.queryStringParameters || {};
    const authToken = queryParams.token || (event.headers?.Authorization || '').replace('Bearer ', '') || '';

    let userId = null;
    if (authToken) {
      const user = auth.decodeJWT(authToken);
      if (user) {
        userId = user.sub || user.userId || null;
      }
    }

    // Store connection
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + (24 * 60 * 60); // 24 hours

    const connection = {
      connectionId,
      userId: userId || 'anonymous',
      domainName,
      stage,
      connectedAt: new Date().toISOString(),
      ttl,
    };

    await db.putItem(CONNECTIONS_TABLE, connection);

    return {
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error connecting WebSocket:', error);
    return {
      statusCode: 500,
    };
  }
};
