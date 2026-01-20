import { APIGatewayProxyWebsocketEventV2, Context } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import * as db from '../../shared/nodejs/dynamodb';

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

const getApiClient = (domainName: string, stage: string) => {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
};

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2,
  context: Context
): Promise<any> => {
  const connectionId = event.requestContext.connectionId!;
  const domainName = event.requestContext.domainName!;
  const stage = event.requestContext.stage!;

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action;

    // Handle different message actions
    switch (action) {
      case 'ping':
        // Respond with pong
        const apiClient = getApiClient(domainName, stage);
        await apiClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: JSON.stringify({ action: 'pong', timestamp: Date.now() }),
        }));
        break;

      case 'subscribe':
        // Subscribe to specific channels (e.g., image updates, validation queue)
        const channels = body.channels || [];
        const connection = await db.getItem(CONNECTIONS_TABLE, { connectionId });
        if (connection) {
          await db.updateItem(CONNECTIONS_TABLE, { connectionId }, {
            subscribedChannels: channels,
          });
        }
        break;

      default:
        console.log('Unknown action:', action);
    }

    return {
      statusCode: 200,
    };
  } catch (error: any) {
    console.error('Error handling WebSocket message:', error);
    return {
      statusCode: 500,
    };
  }
};
