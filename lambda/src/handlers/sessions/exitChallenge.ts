import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Exit challenge request:', JSON.stringify(event, null, 2));

    // Get user from JWT token
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const sessionId = event.pathParameters?.id;
    if (!sessionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Session ID is required' })
      };
    }

    // Get session from DynamoDB
    const session = await getSessionFromDB(sessionId);
    if (!session) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Session not found' })
      };
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    // Clear the current challenge but keep container running
    await clearCurrentChallenge(sessionId);

    // TODO: Send API call to container to clear workspace
    // This would be an HTTP request to the container's API endpoint
    // Example: POST /api/clear-workspace

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId,
        status: 'ready',
        message: 'Challenge exited successfully. Container is ready for new challenges.',
        currentChallenge: null
      })
    };

  } catch (error) {
    console.error('Error exiting challenge:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to exit challenge',
        details: config.isDevelopment ? (error as Error).message : undefined
      })
    };
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

async function clearCurrentChallenge(sessionId: string) {
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'REMOVE currentChallengeId SET lastActivity = :lastActivity, #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':lastActivity': new Date().toISOString(),
      ':status': 'ready'
    }
  });

  await dynamoClient.send(command);
}
