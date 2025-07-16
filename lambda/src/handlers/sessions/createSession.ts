import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ECSClient, RunTaskCommand, RunTaskCommandInput, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  ElasticLoadBalancingV2Client,
  CreateTargetGroupCommand,
  CreateRuleCommand,
  RegisterTargetsCommand,
  ModifyTargetGroupAttributesCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { createResponse, parseJSONBody } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';
import { ContainerChallengeLoader } from '../../services/containerChallengeLoader';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));
const elbClient = new ElasticLoadBalancingV2Client({ region: config.region });
const lambdaClient = new LambdaClient({ region: config.region });

interface CreateSessionRequest {
  challengeId: string;
  resourceProfile?: 'development' | 'basic' | 'advanced' | 'competition';
}

type ServiceType = 'main' | 'nt' | 'halsim' | 'jdtls';

// ALB Helper Functions
async function createSessionTargetGroup(sessionId: string, port: number, serviceType: ServiceType): Promise<string> {
  const shortSessionId = sessionId.substring(0, 8);
  const targetGroupName = `frc-${serviceType}-${shortSessionId}`;

  const healthCheckPath = `/session/${sessionId}/${serviceType}/health`;


  const command = new CreateTargetGroupCommand({
    Name: targetGroupName,
    Protocol: 'HTTP',
    Port: port,
    VpcId: config.alb.vpcId,
    TargetType: 'ip',
    HealthCheckEnabled: true,
    HealthCheckPath: healthCheckPath,
    HealthCheckProtocol: 'HTTP',
    HealthCheckIntervalSeconds: 30,
    HealthCheckTimeoutSeconds: 10,
    HealthyThresholdCount: 2,
    UnhealthyThresholdCount: 3,
    Tags: [
      { Key: 'SessionId', Value: sessionId },
      { Key: 'Environment', Value: config.stage },
      { Key: 'Project', Value: 'frc-challenge-site' },
      { Key: 'ServiceType', Value: serviceType }
    ]
  });

  const result = await elbClient.send(command);
  const targetGroupArn = result.TargetGroups?.[0]?.TargetGroupArn || '';

  // Configure WebSocket-friendly target group attributes
  if (targetGroupArn) {
    try {
      await elbClient.send(new ModifyTargetGroupAttributesCommand({
        TargetGroupArn: targetGroupArn,
        Attributes: [
          {
            Key: 'deregistration_delay.timeout_seconds',
            Value: '30'
          },
          {
            Key: 'stickiness.enabled',
            Value: 'false'
          }
        ]
      }));
      console.log(`✅ Configured WebSocket-friendly attributes for ${serviceType} target group`);
    } catch (error) {
      console.warn(`⚠️ Failed to set target group attributes for ${serviceType}:`, error);
    }
  }

  return targetGroupArn;
}

async function createSessionListenerRule(sessionId: string, targetGroupArn: string, serviceType: ServiceType): Promise<string> {
  const priority = 1 + Math.floor(Math.random() * 50000); // Random priority between 1-50000

  // Path pattern that matches both exact path and paths with trailing content
  // This matches: /session/{sessionId}/{serviceType}, /session/{sessionId}/{serviceType}/, /session/{sessionId}/{serviceType}/*
  const pathPattern = `/session/${sessionId}/${serviceType}*`;

  // Use HTTPS listener if available, otherwise HTTP
  const listenerArn = config.alb.httpsListenerArn || config.alb.listenerArn;

  const command = new CreateRuleCommand({
    ListenerArn: listenerArn,
    Priority: priority,
    Conditions: [
      {
        Field: 'path-pattern',
        Values: [pathPattern]
      }
    ],
    Actions: [
      {
        Type: 'forward',
        TargetGroupArn: targetGroupArn
      }
    ],
    Tags: [
      { Key: 'SessionId', Value: sessionId },
      { Key: 'Environment', Value: config.stage },
      { Key: 'Project', Value: 'frc-challenge-site' },
      { Key: 'ServiceType', Value: serviceType }
    ]
  });

  const result = await elbClient.send(command);
  return result.Rules?.[0]?.RuleArn || '';
}

async function initializeSessionInContainer(sessionId: string, challengeId: string, userId: string, containerEndpoint: string): Promise<void> {
  console.log(`Initializing session ${sessionId} in container...`);

  try {
    // Wait a bit for container to be fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to initialize session via container API
    const sessionData = {
      sessionId,
      challengeId,
      userId,
      createdAt: new Date().toISOString()
    };

    // Attempt to create session in container
    const response = await fetch(`${containerEndpoint}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });

    if (response.ok) {
      console.log(`Session ${sessionId} initialized successfully in container`);
    } else {
      console.log(`Failed to initialize session in container: ${response.status} ${response.statusText}`);
    }

  } catch (error) {
    console.log(`Error initializing session in container: ${(error as Error).message}`);
    // Don't throw - this is a best-effort initialization
  }
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
      return createResponse(401, { error: 'Unauthorized' }, event);
    }

    // Parse request body
    const body = parseJSONBody<CreateSessionRequest>(event.body);
    if (!body || !body.challengeId) {
      return createResponse(400, { error: 'challengeId is required' }, event);
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
        }, event);
      }

      if (userContainer.currentChallengeId === challengeId) {
        // User is trying to re-enter the same challenge
        return createResponse(200, {
          message: 'Resuming existing challenge session',
          sessionId: userContainer.sessionId,
          challengeId,
          status: userContainer.status,
          containerEndpoint: userContainer.containerEndpoint
        }, event);
      }

      // Container exists but no current challenge - load the new challenge
      await loadChallengeInContainer(userContainer.sessionId, challengeId);

      return createResponse(200, {
        message: 'Loading challenge in existing container',
        sessionId: userContainer.sessionId,
        challengeId,
        status: 'loading_challenge',
        containerEndpoint: userContainer.containerEndpoint
      }, event);
    }

    // Generate session ID
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_LIMITS.sessionTimeoutMinutes * 60 * 1000);

    // Create ECS task
    const taskArn = await createECSTask(userId, challengeId, sessionId, resourceProfile);
    console.log(`Created ECS task: ${taskArn}`);

    // Setup ALB integration (target group and listener rule)
    const albIntegration = await setupALBIntegration(sessionId);

    // Store session in DynamoDB with ALB details
    await storeSession({
      sessionId,
      userId,
      challengeId,
      taskArn,
      resourceProfile,
      status: 'starting',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      // ALB integration details
      mainTargetGroupArn: albIntegration.mainTargetGroupArn,
      nt4TargetGroupArn: albIntegration.nt4TargetGroupArn,
      halsimTargetGroupArn: albIntegration.halsimTargetGroupArn,
      jdtlsTargetGroupArn: albIntegration.jdtlsTargetGroupArn,
      mainRuleArn: albIntegration.mainRuleArn,
      nt4RuleArn: albIntegration.nt4RuleArn,
      halsimRuleArn: albIntegration.halsimRuleArn,
      jdtlsRuleArn: albIntegration.jdtlsRuleArn,
      containerEndpoint: albIntegration.endpoints.main,
      nt4Endpoint: albIntegration.endpoints.nt4,
      halsimEndpoint: albIntegration.endpoints.halsim,
      jdtlsEndpoint: albIntegration.endpoints.jdtls,
      healthEndpoint: albIntegration.endpoints.health
    });

    // Start background processes for container setup asynchronously
    await invokeBackgroundProcess(sessionId, challengeId, userId, taskArn, albIntegration)

    return createResponse(201, {
      sessionId,
      challengeId,
      status: 'starting',
      taskArn,
      expiresAt: expiresAt.toISOString(),
      resourceProfile,
      endpoints: albIntegration.endpoints,
      estimatedStartupTime: '3-5 minutes (includes container startup, ALB registration, and session initialization)'
    }, event);

  } catch (error) {
    console.error('Error creating session:', error);
    return createResponse(500, {
      error: 'Failed to create session',
      details: config.isDevelopment ? (error as Error).message : undefined
    }, event);
  }
};

async function getUserContainer(userId: string) {
  const command = new QueryCommand({
    TableName: config.tables.challengeSessions,
    IndexName: 'UserIndex',
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
    Limit: 1,
    ScanIndexForward: false // Get most recent first
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
    enableExecuteCommand: true, // Enable ECS Exec for debugging
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
  console.log(`Loading challenge ${challengeId} in session ${sessionId}`);

  try {
    // Create the container challenge loader
    const loader = new ContainerChallengeLoader();

    // Prepare challenge setup
    const challengeSetup = await loader.prepareChallengeSetup(challengeId);
    const setupPayload = loader.generateContainerSetupPayload(challengeSetup);

    console.log(`Challenge setup prepared for ${challengeId}:`, JSON.stringify(setupPayload, null, 2));

    // Send setup payload to container via API
    await sendChallengeSetupToContainer(sessionId, setupPayload);

    // Update the session record
    const command = new PutCommand({
      TableName: config.tables.challengeSessions,
      Item: {
        sessionId,
        currentChallengeId: challengeId,
        lastActivity: new Date().toISOString()
      }
    });

    await dynamoClient.send(command);

    console.log(`Challenge ${challengeId} loaded successfully in session ${sessionId}`);
  } catch (error) {
    console.error(`Failed to load challenge ${challengeId} in session ${sessionId}:`, error);
    throw error;
  }
}

async function sendChallengeSetupToContainer(sessionId: string, setupPayload: any): Promise<void> {
  try {
    // Get the container endpoint from ALB configuration
    const containerEndpoint = `${process.env.ALB_DNS_NAME}/session/${sessionId}/main/setup-challenge`;

    console.log(`Sending challenge setup to container: ${containerEndpoint}`);

    const response = await fetch(`http://${containerEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(setupPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Container setup failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`Challenge setup successful:`, result);

  } catch (error) {
    console.error(`Failed to send challenge setup to container:`, error);
    throw error;
  }
}

function storeSession(session: any) {
  console.log(`Storing session into table ${config.tables.challengeSessions}: ${JSON.stringify(session, null, 2)}`);
  const command = new PutCommand({
    TableName: config.tables.challengeSessions,
    Item: session
  });

  return dynamoClient.send(command);
}

async function invokeBackgroundProcess(
  sessionId: string,
  challengeId: string,
  userId: string,
  taskArn: string,
  albIntegration: any
): Promise<void> {
  console.log(`Starting background process for session ${sessionId}`);

  try {
    // Create a separate Lambda function name for background processing
    const functionName = `frc-challenge-api-${config.stage}-containerSetup`;

    const payload = {
      sessionId,
      challengeId,
      userId,
      taskArn,
      albIntegration
    };

    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(payload)
    });

    await lambdaClient.send(command);
    console.log(`Background process invoked successfully for session ${sessionId}`);

  } catch (error) {
    console.error(`Failed to invoke background process for session ${sessionId}:`, error);
    console.log('...:', setupContainerIntegration);
  }
}

async function setupContainerIntegration(
  sessionId: string,
  challengeId: string,
  userId: string,
  taskArn: string,
  albIntegration: any
): Promise<void> {
  console.log(`Setting up container integration for session ${sessionId}`);

  try {
    // Step 1: Wait for ECS task to be running and get private IP
    const privateIp = await waitForTaskAndGetIP(taskArn);
    console.log(`Task is running with IP: ${privateIp}`);

    // Step 2: Register task with ALB target groups
    await registerTaskWithTargetGroups(privateIp, albIntegration);
    console.log(`Task registered with ALB target groups`);

    // Step 3: Wait for container to be healthy and initialize session
    await waitForContainerHealth(albIntegration.endpoints.health);
    console.log(`Container is healthy`);

    // Step 4: Initialize session in container
    await initializeSessionInContainer(sessionId, challengeId, userId, albIntegration.endpoints.main);
    console.log(`Session initialized in container`);

    // Step 5: Update session status to running
    await updateSessionStatus(sessionId, 'running');
    console.log(`Session ${sessionId} is now running`);

  } catch (error) {
    console.error(`Container integration failed for session ${sessionId}:`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    try {
      await updateSessionStatus(sessionId, 'failed');
    } catch (updateError) {
      console.error('Failed to update session status:', updateError);
    }
  }
}

async function waitForTaskAndGetIP(taskArn: string): Promise<string> {
  const maxAttempts = 60; // 10 minutes max
  const delayMs = 10000; // 10 seconds between checks

  console.log(`Waiting for ECS task to be running: ${taskArn}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const command = new DescribeTasksCommand({
        cluster: config.ecs.clusterName,
        tasks: [taskArn]
      });

      const result = await ecsClient.send(command);
      const task = result.tasks?.[0];

      if (task?.lastStatus === 'RUNNING' && task.containers?.[0]?.networkInterfaces?.[0]?.privateIpv4Address) {
        const privateIp = task.containers[0].networkInterfaces[0].privateIpv4Address;
        console.log(`✅ Task is running with IP: ${privateIp}`);
        return privateIp;
      }

      if (task?.lastStatus === 'STOPPED') {
        console.log(`❌ Task stopped. Reason: ${task.stoppedReason || 'Unknown'}`);
        throw new Error(`ECS task stopped: ${task.stoppedReason || 'Unknown reason'}`);
      }

      console.log(`Attempt ${attempt}/${maxAttempts}: Task status is ${task?.lastStatus}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

    } catch (error) {
      console.log(`Error checking task status: ${(error as Error).message}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Task did not reach running state with IP within timeout');
}

async function registerTaskWithTargetGroups(privateIp: string, albIntegration: any): Promise<void> {
  console.log(`Registering task ${privateIp} with target groups...`);
  console.log(`Main TG ARN: ${albIntegration.mainTargetGroupArn}`);
  console.log(`NT4 TG ARN: ${albIntegration.nt4TargetGroupArn}`);
  console.log(`HALSim TG ARN: ${albIntegration.halsimTargetGroupArn}`);
  console.log(`JDTLS TG ARN: ${albIntegration.jdtlsTargetGroupArn}`);

  const maxRetries = 3;

  for (let retry = 1; retry <= maxRetries; retry++) {
    try {
      // Register with main target group (port 30003)
      console.log(`Registering with main target group (port 30003)... (attempt ${retry}/${maxRetries})`);
      await elbClient.send(new RegisterTargetsCommand({
        TargetGroupArn: albIntegration.mainTargetGroupArn,
        Targets: [{ Id: privateIp, Port: 30003 }]
      }));
      console.log(`✅ Successfully registered with main target group`);

      // Register with NT4 target group (port 30004)
      console.log(`Registering with NT4 target group (port 30004)... (attempt ${retry}/${maxRetries})`);
      await elbClient.send(new RegisterTargetsCommand({
        TargetGroupArn: albIntegration.nt4TargetGroupArn,
        Targets: [{ Id: privateIp, Port: 30004 }]
      }));
      console.log(`✅ Successfully registered with NT4 target group`);

      // Register with HALSim target group (port 30005)
      console.log(`Registering with HALSim target group (port 30005)... (attempt ${retry}/${maxRetries})`);
      await elbClient.send(new RegisterTargetsCommand({
        TargetGroupArn: albIntegration.halsimTargetGroupArn,
        Targets: [{ Id: privateIp, Port: 30005 }]
      }));
      console.log(`✅ Successfully registered with HALSim target group`);

      // Register with JDTLS target group (port 30006)
      console.log(`Registering with JDTLS target group (port 30006)... (attempt ${retry}/${maxRetries})`);
      await elbClient.send(new RegisterTargetsCommand({
        TargetGroupArn: albIntegration.jdtlsTargetGroupArn,
        Targets: [{ Id: privateIp, Port: 30006 }]
      }));
      console.log(`✅ Successfully registered with JDTLS target group`);

      // If we get here, all registrations succeeded
      return;

    } catch (error) {
      console.error(`❌ Failed to register targets (attempt ${retry}/${maxRetries}):`, error);

      if (retry === maxRetries) {
        throw error; // Final attempt failed
      }

      // Wait before retrying
      console.log(`⏳ Waiting 5 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function waitForContainerHealth(healthEndpoint: string): Promise<void> {
  const maxAttempts = 20; // 10 minutes max
  const delayMs = 30000; // 30 seconds between checks

  console.log(`Waiting for container health check: ${healthEndpoint}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(healthEndpoint, {
        method: 'GET'
      });

      if (response.ok) {
        console.log(`Container health check passed on attempt ${attempt}`);
        return;
      }

      console.log(`Attempt ${attempt}/${maxAttempts}: Health check returned ${response.status}, waiting...`);

    } catch (error) {
      console.log(`Attempt ${attempt}/${maxAttempts}: Health check failed, waiting...`);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Container health check did not pass within timeout');
}

async function updateSessionStatus(sessionId: string, status: string): Promise<void> {
  const command = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId },
    UpdateExpression: 'SET #status = :status, lastActivity = :lastActivity',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':lastActivity': new Date().toISOString()
    }
  });

  await dynamoClient.send(command);
}

async function setupALBIntegration(sessionId: string): Promise<{
  mainTargetGroupArn: string;
  nt4TargetGroupArn: string;
  halsimTargetGroupArn: string;
  jdtlsTargetGroupArn: string;
  mainRuleArn: string;
  nt4RuleArn: string;
  halsimRuleArn: string;
  jdtlsRuleArn: string;
  endpoints: {
    main: string;
    nt4: string;
    halsim: string;
    jdtls: string;
    health: string;
  }
}> {
  console.log(`Setting up multi-service ALB integration for session ${sessionId}`);

  try {
    // Step 1: Create target groups for different services
    const mainTargetGroupArn = await createSessionTargetGroup(sessionId, 30003, 'main');
    console.log(`Created main target group: ${mainTargetGroupArn}`);

    const nt4TargetGroupArn = await createSessionTargetGroup(sessionId, 30004, 'nt');
    console.log(`Created NT4 target group: ${nt4TargetGroupArn}`);

    const halsimTargetGroupArn = await createSessionTargetGroup(sessionId, 30005, 'halsim');
    console.log(`Created HALSim target group: ${halsimTargetGroupArn}`);

    const jdtlsTargetGroupArn = await createSessionTargetGroup(sessionId, 30006, 'jdtls');
    console.log(`Created JDTLS target group: ${jdtlsTargetGroupArn}`);

    // Step 2: Create listener rules for different services
    const mainRuleArn = await createSessionListenerRule(sessionId, mainTargetGroupArn, 'main');
    console.log(`Created main listener rule: ${mainRuleArn}`);

    const nt4RuleArn = await createSessionListenerRule(sessionId, nt4TargetGroupArn, 'nt');
    console.log(`Created NT4 listener rule: ${nt4RuleArn}`);

    const halsimRuleArn = await createSessionListenerRule(sessionId, halsimTargetGroupArn, 'halsim');
    console.log(`Created HALSim listener rule: ${halsimRuleArn}`);

    const jdtlsRuleArn = await createSessionListenerRule(sessionId, jdtlsTargetGroupArn, 'jdtls');
    console.log(`Created JDTLS listener rule: ${jdtlsRuleArn}`);

    // Step 3: Generate the public endpoint URLs
    // Use CloudFront if enabled, otherwise use ALB directly
    const protocol = config.cloudfront.enabled ? 'https' : (config.alb.sslCertificateArn ? 'https' : 'http');
    const domainName = config.cloudfront.enabled ? config.cloudfront.domainName : config.alb.dnsName;

    console.log(`Using ${config.cloudfront.enabled ? 'CloudFront' : 'ALB'} endpoints with domain: ${domainName}`);

    const endpoints = {
      main: `${protocol}://${domainName}/session/${sessionId}/`,
      nt4: `${protocol}://${domainName}/session/${sessionId}/nt/`,
      halsim: `${protocol}://${domainName}/session/${sessionId}/halsim/`,
      jdtls: `${protocol}://${domainName}/session/${sessionId}/jdtls/`,
      health: `${protocol}://${domainName}/session/${sessionId}/main/health`
    };

    return {
      mainTargetGroupArn,
      nt4TargetGroupArn,
      halsimTargetGroupArn,
      jdtlsTargetGroupArn,
      mainRuleArn,
      nt4RuleArn,
      halsimRuleArn,
      jdtlsRuleArn,
      endpoints
    };

  } catch (error) {
    console.error('Error setting up ALB integration:', error);
    throw new Error(`Failed to setup ALB integration: ${(error as Error).message}`);
  }
}
