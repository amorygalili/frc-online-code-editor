import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

interface SwitchChallengeRequest {
  newChallengeId: string;
  saveCurrentWork?: boolean;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Switch challenge request:', JSON.stringify(event, null, 2));

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

    // Parse request body
    const body = JSON.parse(event.body || '{}') as SwitchChallengeRequest;
    if (!body.newChallengeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'newChallengeId is required' })
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

    // Check if container is ready
    if (session.status !== 'running' && session.status !== 'ready') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Container is not ready for challenge switching',
          status: session.status
        })
      };
    }

    const previousChallenge = session.currentChallengeId;

    // TODO: If saveCurrentWork is true, save current workspace to S3/EFS
    if (body.saveCurrentWork && previousChallenge) {
      await saveWorkspace(sessionId, previousChallenge);
    }

    // Switch to new challenge
    await switchToChallenge(sessionId, body.newChallengeId);

    // TODO: Send API call to container to load new challenge
    // This would be an HTTP request to the container's API endpoint
    // Example: POST /api/switch-challenge with { challengeId, saveWork }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId,
        previousChallenge,
        newChallenge: body.newChallengeId,
        status: 'switching_challenge',
        message: 'Challenge switch initiated. This should complete in a few seconds.',
        workSaved: body.saveCurrentWork || false
      })
    };

  } catch (error) {
    console.error('Error switching challenge:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to switch challenge',
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

async function switchToChallenge(sessionId: string, newChallengeId: string) {
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'SET currentChallengeId = :challengeId, lastActivity = :lastActivity, #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':challengeId': newChallengeId,
      ':lastActivity': new Date().toISOString(),
      ':status': 'switching_challenge'
    }
  });

  await dynamoClient.send(command);
}

async function saveWorkspace(sessionId: string, challengeId: string) {
  // TODO: Implement workspace saving logic
  // This could involve:
  // 1. Calling container API to get current workspace state
  // 2. Saving to S3 with key: `workspaces/${userId}/${challengeId}/${timestamp}.zip`
  // 3. Updating user progress in database
  
  console.log(`Saving workspace for session ${sessionId}, challenge ${challengeId}`);
  
  // Placeholder implementation
  return Promise.resolve();
}
