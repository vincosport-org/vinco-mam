/**
 * WebSocket Disconnect Handler
 */
const db = require('/opt/nodejs/dynamodb');

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

exports.handler = async (event, context) => {
  const connectionId = event.requestContext.connectionId;

  try {
    // Remove connection from table
    await db.deleteItem(CONNECTIONS_TABLE, { connectionId });

    return {
      statusCode: 200,
    };
  } catch (error) {
    console.error('Error disconnecting WebSocket:', error);
    return {
      statusCode: 500,
    };
  }
};
