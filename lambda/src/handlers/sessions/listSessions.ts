import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';
import { corsHeaders, createResponse } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('List sessions request:', JSON.stringify(event, null, 2));

    // Get user from JWT token
    const user = getUserFromEvent(event);
    if (!user) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const userId = user.sub;
    
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status; // Filter by status if provided
    const limit = parseInt(queryParams.limit || '50');
    const lastEvaluatedKey = queryParams.lastEvaluatedKey;

    // Build query
    let filterExpression = '';
    let expressionAttributeValues: any = {
      ':userId': userId
    };
    let expressionAttributeNames: any = {};

    if (status) {
      filterExpression = '#status = :status';
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }

    const queryCommand = new QueryCommand({
      TableName: config.tables.challengeSessions,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: filterExpression || undefined,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(decodeURIComponent(lastEvaluatedKey)) : undefined,
      ScanIndexForward: false // Most recent first
    });

    const result = await dynamoClient.send(queryCommand);
    const sessions = result.Items || [];

    // Calculate additional info for each session
    const now = new Date();
    const enrichedSessions = sessions.map(session => {
      const expiresAt = new Date(session.expiresAt);
      const createdAt = new Date(session.createdAt);
      const remainingMinutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)));
      const durationMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
      const isExpired = now > expiresAt;

      return {
        sessionId: session.sessionId,
        challengeId: session.challengeId,
        status: session.status,
        resourceProfile: session.resourceProfile,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
        terminatedAt: session.terminatedAt,
        remainingMinutes,
        durationMinutes,
        isExpired,
        // Don't expose sensitive info like taskArn in list view
      };
    });

    // Group sessions by status for summary
    const statusSummary = enrichedSessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      sessions: enrichedSessions,
      summary: {
        total: enrichedSessions.length,
        statusBreakdown: statusSummary,
        activeCount: (statusSummary.starting || 0) + (statusSummary.running || 0),
        maxConcurrentSessions: 3 // From session limits
      },
      pagination: {
        hasMore: !!result.LastEvaluatedKey,
        lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
        limit
      }
    };

    return createResponse(200, response);

  } catch (error) {
    console.error('Error listing sessions:', error);
    return createResponse(500, { 
      error: 'Failed to list sessions',
      details: config.isDevelopment ? error.message : undefined
    });
  }
};
