/**
 * DynamoDB helper utilities
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Get item from DynamoDB
 */
exports.getItem = async (tableName, key) => {
  const command = new GetCommand({
    TableName: tableName,
    Key: key,
  });
  const response = await docClient.send(command);
  return response.Item;
};

/**
 * Put item to DynamoDB
 */
exports.putItem = async (tableName, item) => {
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
  });
  await docClient.send(command);
  return item;
};

/**
 * Update item in DynamoDB
 */
exports.updateItem = async (tableName, key, updates) => {
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  
  Object.entries(updates).forEach(([field, value], index) => {
    const nameKey = `#${field}`;
    const valueKey = `:val${index}`;
    updateExpression.push(`${nameKey} = ${valueKey}`);
    expressionAttributeNames[nameKey] = field;
    expressionAttributeValues[valueKey] = value;
  });
  
  // Add updatedAt
  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();
  
  const command = new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });
  
  const response = await docClient.send(command);
  return response.Attributes;
};

/**
 * Query DynamoDB table
 */
exports.query = async (tableName, keyConditionExpression, expressionAttributeValues, indexName = null, limit = null, exclusiveStartKey = null) => {
  const params = {
    TableName: tableName,
    KeyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };
  
  if (indexName) {
    params.IndexName = indexName;
  }
  
  if (limit) {
    params.Limit = limit;
  }
  
  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }
  
  const command = new QueryCommand(params);
  const response = await docClient.send(command);
  return {
    items: response.Items || [],
    lastEvaluatedKey: response.LastEvaluatedKey,
  };
};

/**
 * Scan DynamoDB table
 */
exports.scan = async (tableName, filterExpression = null, expressionAttributeValues = null, limit = null, exclusiveStartKey = null) => {
  const params = {
    TableName: tableName,
  };
  
  if (filterExpression) {
    params.FilterExpression = filterExpression;
    params.ExpressionAttributeValues = expressionAttributeValues;
  }
  
  if (limit) {
    params.Limit = limit;
  }
  
  if (exclusiveStartKey) {
    params.ExclusiveStartKey = exclusiveStartKey;
  }
  
  const command = new ScanCommand(params);
  const response = await docClient.send(command);
  return {
    items: response.Items || [],
    lastEvaluatedKey: response.LastEvaluatedKey,
  };
};

/**
 * Delete item from DynamoDB
 */
exports.deleteItem = async (tableName, key) => {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
  });
  await docClient.send(command);
};

module.exports = exports;
