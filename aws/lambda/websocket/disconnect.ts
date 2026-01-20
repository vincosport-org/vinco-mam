import { APIGatewayProxyWebsocketEventV2, Context } from 'aws-lambda';
import * as db from '../../shared/nodejs/dynamodb';

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2,
  context: Context
): Promise<any> => {
  const connectionId = event.requestContext.connectionId!;

  try {
    // Remove connection from table
    await db.deleteItem(CONNECTIONS_TABLE, { connectionId });

    return {
      statusCode: 200,
    };
  } catch (error: any) {
    console.error('Error disconnecting WebSocket:', error);
    return {
      statusCode: 500,
    };
  }
};
