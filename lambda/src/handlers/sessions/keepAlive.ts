import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';
import { corsHeaders, createResponse } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

const SESSION_TIMEOUT_MINUTES = 120; // 2 hours
const IDLE_TIMEOUT_MINUTES = 30; // 30 minutes

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Keep alive request:', JSON.stringify(event, null, 2));

    // Get user from JWT token
    const user = getUserFromEvent(event);
    if (!user) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const sessionId = event.pathParameters?.id;
    if (!sessionId) {
      return createResponse(400, { error: 'Session ID is required' });
    }

    // Get session from DynamoDB
    const session = await getSessionFromDB(sessionId);
    if (!session) {
      return createResponse(404, { error: 'Session not found' });
    }

    // Verify user owns this session
    if (session.userId !== user.sub) {
      return createResponse(403, { error: 'Access denied' });
    }

    // Check if session is in a state that can be kept alive
    if (session.status !== 'running' && session.status !== 'starting') {
      return createResponse(400, { 
        error: 'Session cannot be kept alive',
        status: session.status
      });
    }

    const now = new Date();
    const currentExpiry = new Date(session.expiresAt);
    
    // Check if session has already expired
    if (now > currentExpiry) {
      return createResponse(410, { 
        error: 'Session has expired',
        expiredAt: session.expiresAt
      });
    }

    // Calculate new expiry time
    const newExpiry = new Date(now.getTime() + SESSION_TIMEOUT_MINUTES * 60 * 1000);
    
    // Update last activity and extend expiry
    await updateSessionActivity(sessionId, newExpiry);

    // Calculate remaining time
    const remainingMinutes = Math.floor((newExpiry.getTime() - now.getTime()) / (1000 * 60));

    return createResponse(200, {
      sessionId,
      status: session.status,
      lastActivity: now.toISOString(),
      expiresAt: newExpiry.toISOString(),
      remainingMinutes,
      message: 'Session kept alive successfully'
    });

  } catch (error) {
    console.error('Error keeping session alive:', error);
    return createResponse(500, { 
      error: 'Failed to keep session alive',
      details: config.isDevelopment ? error.message : undefined
    });
  }
};

async function getSessionFromDB(sessionId: string) {
  const command = new GetCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId }
  });

  const result = await dynamoClient.send(command);
  return result.Item;
}

async function updateSessionActivity(sessionId: string, newExpiry: Date) {
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'SET lastActivity = :lastActivity, expiresAt = :expiresAt',
    ExpressionAttributeValues: {
      ':lastActivity': new Date().toISOString(),
      ':expiresAt': newExpiry.toISOString()
    }
  });

  await dynamoClient.send(command);
}
