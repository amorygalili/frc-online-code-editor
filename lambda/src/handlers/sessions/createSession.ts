import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ECSClient, RunTaskCommand, RunTaskCommandInput } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { createResponse, parseJSONBody } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

interface CreateSessionRequest {
  challengeId: string;
  resourceProfile?: 'development' | 'basic' | 'advanced' | 'competition';
}

interface SessionLimits {
  maxContainersPerUser: number;
  maxChallengesPerContainer: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
}

const SESSION_LIMITS: SessionLimits = {
  maxContainersPerUser: 1,        // One container per user
  maxChallengesPerContainer: 1,   // One challenge at a time
  sessionTimeoutMinutes: 240,     // 4 hours (longer since container is reused)
  idleTimeoutMinutes: 60,         // 1 hour idle timeout
};

const RESOURCE_PROFILES: Record<string, { cpu: string; memory: string; javaHeapSize: string }> = {
  development: { cpu: '512', memory: '1024', javaHeapSize: '768' },
  basic: { cpu: '1024', memory: '2048', javaHeapSize: '1536' },
  advanced: { cpu: '2048', memory: '4096', javaHeapSize: '3072' },
  competition: { cpu: '4096', memory: '8192', javaHeapSize: '6144' },
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Create session request:', JSON.stringify(event, null, 2));

    // Get user from JWT token
    const user = getUserFromEvent(event);
    if (!user) {
      return createResponse(401, { error: 'Unauthorized' });
    }

    // Parse request body
    const body = parseJSONBody<CreateSessionRequest>(event.body);
    if (!body || !body.challengeId) {
      return createResponse(400, { error: 'challengeId is required' });
    }

    const { challengeId, resourceProfile = 'basic' } = body;
    const userId = user.sub;

    // Check if user has an active container
    const userContainer = await getUserContainer(userId);

    if (userContainer) {
      // User has an existing container
      if (userContainer.currentChallengeId && userContainer.currentChallengeId !== challengeId) {
        // User is trying to switch challenges - require explicit exit
        return createResponse(409, {
          error: 'You must exit your current challenge before starting a new one',
          currentChallenge: userContainer.currentChallengeId,
          sessionId: userContainer.sessionId,
          action: 'exit_current_challenge_required'
        });
      }

      if (userContainer.currentChallengeId === challengeId) {
        // User is trying to re-enter the same challenge
        return createResponse(200, {
          message: 'Resuming existing challenge session',
          sessionId: userContainer.sessionId,
          challengeId,
          status: userContainer.status,
          containerEndpoint: userContainer.containerEndpoint
        });
      }

      // Container exists but no current challenge - load the new challenge
      await loadChallengeInContainer(userContainer.sessionId, challengeId);

      return createResponse(200, {
        message: 'Loading challenge in existing container',
        sessionId: userContainer.sessionId,
        challengeId,
        status: 'loading_challenge',
        containerEndpoint: userContainer.containerEndpoint
      });
    }

    // Generate session ID
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_LIMITS.sessionTimeoutMinutes * 60 * 1000);

    // Create ECS task
    const taskArn = await createECSTask(userId, challengeId, sessionId, resourceProfile);

    // Store session in DynamoDB
    await storeSession({
      sessionId,
      userId,
      challengeId,
      taskArn,
      resourceProfile,
      status: 'starting',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });

    return createResponse(201, {
      sessionId,
      challengeId,
      status: 'starting',
      taskArn,
      expiresAt: expiresAt.toISOString(),
      resourceProfile,
      estimatedStartupTime: '60-90 seconds'
    });

  } catch (error) {
    console.error('Error creating session:', error);
    return createResponse(500, {
      error: 'Failed to create session',
      details: config.isDevelopment ? (error as Error).message : undefined
    });
  }
};

async function getUserContainer(userId: string) {
  const command = new QueryCommand({
    TableName: config.tables.challengeSessions,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    FilterExpression: '#status IN (:starting, :running)',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':starting': 'starting',
      ':running': 'running'
    },
    Limit: 1
  });

  const result = await dynamoClient.send(command);
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

// Removed unused function getActiveSessionsForUser

async function createECSTask(userId: string, challengeId: string, sessionId: string, resourceProfile: string): Promise<string> {
  const profile = RESOURCE_PROFILES[resourceProfile] || RESOURCE_PROFILES.basic;
  
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
            { name: 'CHALLENGE_ID', value: challengeId },
            { name: 'USER_ID', value: userId },
            { name: 'SESSION_ID', value: sessionId },
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
      { key: 'Component', value: 'challenge-session' },
      { key: 'UserId', value: userId },
      { key: 'ChallengeId', value: challengeId },
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

async function loadChallengeInContainer(sessionId: string, challengeId: string) {
  // TODO: Implement challenge loading logic
  // This would typically involve calling the container API to load a specific challenge
  console.log(`Loading challenge ${challengeId} in session ${sessionId}`);

  // For now, just update the session record
  const command = new PutCommand({
    TableName: config.tables.challengeSessions,
    Item: {
      sessionId,
      currentChallengeId: challengeId,
      lastActivity: new Date().toISOString()
    }
  });

  await dynamoClient.send(command);
}

async function storeSession(session: any) {
  const command = new PutCommand({
    TableName: config.tables.challengeSessions,
    Item: session
  });

  await dynamoClient.send(command);
}
