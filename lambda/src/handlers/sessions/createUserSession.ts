import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ECSClient, RunTaskCommand, RunTaskCommandInput } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

interface CreateSessionRequest {
  challengeId: string;
  resourceProfile?: 'development' | 'basic' | 'advanced' | 'competition';
}

interface UserContainer {
  sessionId: string;
  userId: string;
  taskArn: string;
  containerEndpoint?: string;
  status: string;
  currentChallengeId?: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

const SESSION_LIMITS = {
  maxContainersPerUser: 1,        // One container per user
  maxChallengesPerContainer: 1,   // One challenge at a time
  sessionTimeoutMinutes: 240,     // 4 hours (longer since container is reused)
  idleTimeoutMinutes: 60,         // 1 hour idle timeout
};

const RESOURCE_PROFILES = {
  development: { cpu: '512', memory: '1024', javaHeapSize: '768' },
  basic: { cpu: '1024', memory: '2048', javaHeapSize: '1536' },
  advanced: { cpu: '2048', memory: '4096', javaHeapSize: '3072' },
  competition: { cpu: '4096', memory: '8192', javaHeapSize: '6144' },
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Create user session request:', JSON.stringify(event, null, 2));

    // Get user from JWT token (simplified for example)
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}') as CreateSessionRequest;
    if (!body.challengeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'challengeId is required' })
      };
    }

    const { challengeId, resourceProfile = 'basic' } = body;

    // Check if user has an active container
    const userContainer = await getUserContainer(userId);
    
    if (userContainer) {
      return await handleExistingContainer(userContainer, challengeId);
    } else {
      return await createNewContainer(userId, challengeId, resourceProfile);
    }

  } catch (error) {
    console.error('Error creating session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create session',
        details: config.isDevelopment ? (error as Error).message : undefined
      })
    };
  }
};

async function getUserContainer(userId: string): Promise<UserContainer | null> {
  const command = new QueryCommand({
    TableName: config.tables.challengeSessions,
    IndexName: 'UserIndex',
    KeyConditionExpression: 'userId = :userId',
    FilterExpression: '#status IN (:running, :starting)',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':running': 'running',
      ':starting': 'starting'
    },
    Limit: 1
  });

  const result = await dynamoClient.send(command);
  return result.Items?.[0] as UserContainer || null;
}

async function handleExistingContainer(userContainer: UserContainer, challengeId: string): Promise<APIGatewayProxyResult> {
  if (userContainer.currentChallengeId && userContainer.currentChallengeId !== challengeId) {
    // User is trying to switch challenges - require explicit exit
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: 'You must exit your current challenge before starting a new one',
        currentChallenge: userContainer.currentChallengeId,
        sessionId: userContainer.sessionId,
        action: 'exit_current_challenge_required',
        containerEndpoint: userContainer.containerEndpoint
      })
    };
  }
  
  if (userContainer.currentChallengeId === challengeId) {
    // User is trying to re-enter the same challenge
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Resuming existing challenge session',
        sessionId: userContainer.sessionId,
        challengeId,
        status: userContainer.status,
        containerEndpoint: userContainer.containerEndpoint
      })
    };
  }
  
  // Container exists but no current challenge - load the new challenge
  await loadChallengeInContainer(userContainer.sessionId, challengeId);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Loading challenge in existing container',
      sessionId: userContainer.sessionId,
      challengeId,
      status: 'loading_challenge',
      containerEndpoint: userContainer.containerEndpoint
    })
  };
}

async function createNewContainer(userId: string, challengeId: string, resourceProfile: string): Promise<APIGatewayProxyResult> {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_LIMITS.sessionTimeoutMinutes * 60 * 1000);

  // Create ECS task
  const taskArn = await createECSTask(userId, challengeId, sessionId, resourceProfile);

  // Store session in DynamoDB
  await storeUserContainer({
    sessionId,
    userId,
    taskArn,
    status: 'starting',
    currentChallengeId: challengeId,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  });

  return {
    statusCode: 201,
    body: JSON.stringify({
      sessionId,
      challengeId,
      status: 'starting',
      taskArn,
      expiresAt: expiresAt.toISOString(),
      resourceProfile,
      estimatedStartupTime: '60-90 seconds',
      message: 'New container created - this is a one-time startup delay'
    })
  };
}

async function loadChallengeInContainer(sessionId: string, challengeId: string) {
  // Update the current challenge in the container session
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'SET currentChallengeId = :challengeId, lastActivity = :lastActivity, #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':challengeId': challengeId,
      ':lastActivity': new Date().toISOString(),
      ':status': 'loading_challenge'
    }
  });

  await dynamoClient.send(command);

  // TODO: Send API call to container to load the new challenge
  // This would be an HTTP request to the container's API endpoint
  // Example: POST /api/load-challenge with { challengeId }
}

async function createECSTask(userId: string, challengeId: string, sessionId: string, resourceProfile: string): Promise<string> {
  const profile = RESOURCE_PROFILES[resourceProfile as keyof typeof RESOURCE_PROFILES] || RESOURCE_PROFILES.basic;
  
  const taskInput: RunTaskCommandInput = {
    cluster: process.env.ECS_CLUSTER_NAME || 'frc-challenge-cluster',
    taskDefinition: process.env.ECS_TASK_DEFINITION || 'frc-challenge-runtime',
    launchType: 'FARGATE',
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: [
          process.env.PRIVATE_SUBNET_1!,
          process.env.PRIVATE_SUBNET_2!
        ],
        securityGroups: [process.env.CHALLENGE_RUNTIME_SECURITY_GROUP!],
        assignPublicIp: 'DISABLED'
      }
    },
    overrides: {
      containerOverrides: [
        {
          name: 'wpilib-editor',
          environment: [
            { name: 'USER_ID', value: userId },
            { name: 'SESSION_ID', value: sessionId },
            { name: 'INITIAL_CHALLENGE_ID', value: challengeId },
            { name: 'JAVA_OPTS', value: `-Xmx${profile.javaHeapSize}m` },
            { name: 'SESSION_TIMEOUT', value: SESSION_LIMITS.sessionTimeoutMinutes.toString() },
            { name: 'IDLE_TIMEOUT', value: SESSION_LIMITS.idleTimeoutMinutes.toString() }
          ],
          cpu: parseInt(profile.cpu),
          memory: parseInt(profile.memory)
        }
      ]
    },
    tags: [
      { key: 'Environment', value: config.stage },
      { key: 'Project', value: 'frc-challenge-site' },
      { key: 'Component', value: 'user-container' },
      { key: 'UserId', value: userId },
      { key: 'SessionId', value: sessionId },
      { key: 'CreatedBy', value: 'lambda-session-manager' }
    ]
  };

  const command = new RunTaskCommand(taskInput);
  const result = await ecsClient.send(command);

  if (!result.tasks || result.tasks.length === 0) {
    throw new Error('Failed to create ECS task');
  }

  return result.tasks[0].taskArn!;
}

async function storeUserContainer(container: Partial<UserContainer>) {
  const command = new PutCommand({
    TableName: config.tables.challengeSessions,
    Item: container
  });

  await dynamoClient.send(command);
}
