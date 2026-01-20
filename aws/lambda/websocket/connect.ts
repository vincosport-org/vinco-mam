import { APIGatewayProxyWebsocketEventV2, Context } from 'aws-lambda';
import * as db from '../../shared/nodejs/dynamodb';
import * as auth from '../../shared/nodejs/auth';

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2,
  context: Context
): Promise<any> => {
  const connectionId = event.requestContext.connectionId!;
  const domainName = event.requestContext.domainName!;
  const stage = event.requestContext.stage!;

  try {
    // Extract user info from query string or headers
    const queryParams = event.queryStringParameters || {};
    const authToken = queryParams.token || event.headers?.Authorization?.replace('Bearer ', '') || '';
    
    let userId: string | null = null;
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
  } catch (error: any) {
    console.error('Error connecting WebSocket:', error);
    return {
      statusCode: 500,
    };
  }
};
