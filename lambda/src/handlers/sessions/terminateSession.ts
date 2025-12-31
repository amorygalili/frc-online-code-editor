import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ECSClient, StopTaskCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';
import { createResponse } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(
  config.localStack.enabled
    ? { region: config.region, endpoint: config.localStack.endpoint }
    : { region: config.region }
));

// Check if running in local development mode
const isLocalDev = config.isLocal;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Terminate session request:', JSON.stringify(event, null, 2));

    // Get user from JWT token
    const user = getUserFromEvent(event);
    if (!user) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    const sessionId = event.pathParameters?.sessionId;
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

    // Check if session is already terminated
    if (session.status === 'stopped' || session.status === 'failed') {
      return createResponse(200, {
        sessionId,
        status: session.status,
        message: 'Session already terminated'
      });
    }

    // Stop the ECS task (skip in local dev mode - container runs independently)
    let taskStopped = false;
    if (session.taskArn && session.taskArn !== 'local-docker-container') {
      try {
        await stopECSTask(session.taskArn);
        taskStopped = true;
        console.log(`Successfully stopped ECS task: ${session.taskArn}`);
      } catch (error) {
        console.error('Error stopping ECS task:', error);
        // Continue with updating the session status even if task stop fails
        // The task might already be stopped or the ARN might be invalid
      }
    } else if (isLocalDev || session.taskArn === 'local-docker-container') {
      console.log('[LOCAL DEV] Skipping ECS task stop - local container runs independently');
      taskStopped = true; // Mark as stopped for response
    }

    // Update session status in DynamoDB
    await updateSessionStatus(sessionId, 'stopping');

    // TODO: Clean up workspace files if needed
    // This could be done asynchronously via SQS/SNS

    return createResponse(200, {
      sessionId,
      status: 'stopping',
      taskArn: session.taskArn,
      taskStopped,
      message: 'Session termination initiated'
    });

  } catch (error) {
    console.error('Error terminating session:', error);
    return createResponse(500, { 
      error: 'Failed to terminate session',
      details: config.isDevelopment ? (error as Error).message : undefined
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

async function stopECSTask(taskArn: string) {
  const command = new StopTaskCommand({
    cluster: process.env.ECS_CLUSTER_NAME || 'frc-challenge-cluster',
    task: taskArn,
    reason: 'User requested termination'
  });

  await ecsClient.send(command);
}

async function updateSessionStatus(sessionId: string, status: string) {
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity, terminatedAt = :terminatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':lastActivity': new Date().toISOString(),
      ':terminatedAt': new Date().toISOString()
    }
  });

  await dynamoClient.send(command);
}
