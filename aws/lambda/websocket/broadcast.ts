import { EventBridgeEvent, Context } from 'aws-lambda';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import * as db from '../../shared/nodejs/dynamodb';

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

interface BroadcastEvent {
  channel: string;
  message: any;
  userId?: string;
  excludeConnectionId?: string;
}

const getApiClient = (domainName: string, stage: string) => {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
};

export const handler = async (
  event: EventBridgeEvent<'Broadcast', BroadcastEvent>,
  context: Context
): Promise<void> => {
  try {
    const { channel, message, userId, excludeConnectionId } = event.detail;

    // Get all connections (or filter by userId)
    const result = await db.scan(CONNECTIONS_TABLE);

    const connections = result.items || [];
    const matchingConnections = connections.filter((conn: any) => {
      if (excludeConnectionId && conn.connectionId === excludeConnectionId) {
        return false;
      }
      if (userId && conn.userId !== userId) {
        return false;
      }
      const subscribedChannels = conn.subscribedChannels || [];
      return subscribedChannels.includes(channel) || subscribedChannels.includes('*');
    });

    // Broadcast to matching connections
    for (const conn of matchingConnections) {
      try {
        const apiClient = getApiClient(conn.domainName, conn.stage);
        await apiClient.send(new PostToConnectionCommand({
          ConnectionId: conn.connectionId,
          Data: JSON.stringify({
            channel,
            message,
            timestamp: Date.now(),
          }),
        }));
      } catch (error: any) {
        // Connection might be closed, remove it
        if (error.statusCode === 410) {
          await db.deleteItem(CONNECTIONS_TABLE, { connectionId: conn.connectionId });
        }
      }
    }
  } catch (error: any) {
    console.error('Error broadcasting WebSocket message:', error);
    throw error;
  }
};
