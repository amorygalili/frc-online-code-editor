import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ECSClient, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';
import { createResponse } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Get session request:', JSON.stringify(event, null, 2));

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

    // Get current task status from ECS
    const taskStatus = await getTaskStatus(session.taskArn);
    
    // Update session status if it has changed
    if (taskStatus && taskStatus !== session.status) {
      await updateSessionStatus(sessionId, taskStatus);
      session.status = taskStatus;
    }

    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const isExpired = now > expiresAt;

    // Calculate remaining time
    const remainingMinutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)));

    // Get container endpoint if task is running
    let containerEndpoint = null;
    if (session.status === 'running' && session.taskArn) {
      containerEndpoint = await getContainerEndpoint(session.taskArn);
    }

    const response = {
      sessionId: session.sessionId,
      challengeId: session.challengeId,
      status: session.status,
      taskArn: session.taskArn,
      containerEndpoint,
      resourceProfile: session.resourceProfile,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivity: session.lastActivity,
      remainingMinutes,
      isExpired,
      healthStatus: taskStatus === 'running' ? 'healthy' : 'unknown'
    };

    return createResponse(200, response);

  } catch (error) {
    console.error('Error getting session:', error);
    return createResponse(500, { 
      error: 'Failed to get session',
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

async function getTaskStatus(taskArn: string): Promise<string | null> {
  try {
    const command = new DescribeTasksCommand({
      cluster: process.env.ECS_CLUSTER_NAME || 'frc-challenge-cluster',
      tasks: [taskArn]
    });

    const result = await ecsClient.send(command);
    
    if (!result.tasks || result.tasks.length === 0) {
      return 'stopped';
    }

    const task = result.tasks[0];
    const lastStatus = task.lastStatus?.toLowerCase();

    // Map ECS task status to our session status
    switch (lastStatus) {
      case 'pending':
        return 'starting';
      case 'running':
        // Check if container is actually healthy
        const containers = task.containers || [];
        const mainContainer = containers.find(c => c.name === 'wpilib-editor');
        if (mainContainer?.healthStatus === 'HEALTHY') {
          return 'running';
        } else if (mainContainer?.healthStatus === 'UNHEALTHY') {
          return 'failed';
        } else {
          return 'starting'; // Still starting up
        }
      case 'stopped':
        // Check exit code to determine if it was intentional or failed
        const exitCode = task.containers?.[0]?.exitCode;
        return exitCode === 0 ? 'stopped' : 'failed';
      default:
        return lastStatus || 'unknown';
    }
  } catch (error) {
    console.error('Error getting task status:', error);
    return null;
  }
}

async function updateSessionStatus(sessionId: string, status: string) {
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':lastActivity': new Date().toISOString()
    }
  });

  await dynamoClient.send(command);
}

async function getContainerEndpoint(taskArn: string): Promise<string | null> {
  try {
    const command = new DescribeTasksCommand({
      cluster: process.env.ECS_CLUSTER_NAME || 'frc-challenge-cluster',
      tasks: [taskArn],
      include: ['TAGS']
    });

    const result = await ecsClient.send(command);
    
    if (!result.tasks || result.tasks.length === 0) {
      return null;
    }

    const task = result.tasks[0];
    
    // For Fargate tasks, we need to get the private IP
    const networkInterfaces = task.attachments?.find(
      attachment => attachment.type === 'ElasticNetworkInterface'
    )?.details;

    const privateIp = networkInterfaces?.find(
      detail => detail.name === 'privateIPv4Address'
    )?.value;

    if (privateIp) {
      // Return the internal endpoint - this would typically go through a load balancer
      return `http://${privateIp}:30003`;
    }

    return null;
  } catch (error) {
    console.error('Error getting container endpoint:', error);
    return null;
  }
}
