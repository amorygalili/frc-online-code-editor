// DynamoDB utilities
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: config.region,
});

export const dynamoDb = DynamoDBDocumentClient.from(client);

// Table names from configuration
export const TABLES = {
  CHALLENGES: config.tables.challenges,
  USER_PROGRESS: config.tables.userProgress,
  CHALLENGE_SESSIONS: config.tables.challengeSessions,
};

// Helper functions for common DynamoDB operations

export async function getItem<T>(tableName: string, key: Record<string, any>): Promise<T | null> {
  try {
    const result = await dynamoDb.send(new GetCommand({
      TableName: tableName,
      Key: key,
    }));
    
    return result.Item as T || null;
  } catch (error) {
    console.error('DynamoDB getItem error:', error);
    throw error;
  }
}

export async function putItem(tableName: string, item: any): Promise<void> {
  try {
    await dynamoDb.send(new PutCommand({
      TableName: tableName,
      Item: item,
    }));
  } catch (error) {
    console.error('DynamoDB putItem error:', error);
    throw error;
  }
}

export async function updateItem(
  tableName: string,
  key: Record<string, any>,
  updateExpression: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, any>
): Promise<any> {
  try {
    const result = await dynamoDb.send(new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));
    
    return result.Attributes;
  } catch (error) {
    console.error('DynamoDB updateItem error:', error);
    throw error;
  }
}

export async function deleteItem(tableName: string, key: Record<string, any>): Promise<void> {
  try {
    await dynamoDb.send(new DeleteCommand({
      TableName: tableName,
      Key: key,
    }));
  } catch (error) {
    console.error('DynamoDB deleteItem error:', error);
    throw error;
  }
}

export async function queryItems<T>(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, any>,
  indexName?: string,
  limit?: number,
  exclusiveStartKey?: Record<string, any>
): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
  try {
    const result = await dynamoDb.send(new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    }));
    
    return {
      items: result.Items as T[] || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    console.error('DynamoDB queryItems error:', error);
    throw error;
  }
}

export async function scanItems<T>(
  tableName: string,
  filterExpression?: string,
  expressionAttributeNames?: Record<string, string>,
  expressionAttributeValues?: Record<string, any>,
  limit?: number,
  exclusiveStartKey?: Record<string, any>
): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
  try {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    }));
    
    return {
      items: result.Items as T[] || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    console.error('DynamoDB scanItems error:', error);
    throw error;
  }
}

// Helper to generate timestamps
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Helper to generate TTL (Time To Live) for sessions
export function getTTL(hoursFromNow: number): number {
  return Math.floor(Date.now() / 1000) + (hoursFromNow * 60 * 60);
}
