import { ECSClient, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { 
  ElasticLoadBalancingV2Client, 
  RegisterTargetsCommand
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { config } from '../../config';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));
const elbClient = new ElasticLoadBalancingV2Client({ region: config.region });

interface ContainerSetupEvent {
  sessionId: string;
  challengeId: string;
  userId: string;
  taskArn: string;
  albIntegration: {
    mainTargetGroupArn: string;
    nt4TargetGroupArn: string;
    halsimTargetGroupArn: string;
    jdtlsTargetGroupArn: string;
    endpoints: {
      main: string;
      nt4: string;
      halsim: string;
      jdtls: string;
      health: string;
    };
  };
}

export const handler = async (event: ContainerSetupEvent) => {
  const { sessionId, taskArn, albIntegration } = event;
  
  console.log(`Setting up container integration for session ${sessionId}`);
  
  try {
    // Step 1: Wait for ECS task to be running and get private IP
    const privateIp = await waitForTaskAndGetIP(taskArn);
    console.log(`Task is running with IP: ${privateIp}`);
    
    // Step 2: Register task with ALB target groups
    await registerTaskWithTargetGroups(privateIp, albIntegration);
    console.log(`Task registered with ALB target groups`);
    
    // Step 3: Wait for container to be healthy
    await waitForContainerHealth(albIntegration.endpoints.health);
    console.log(`Container is healthy`);
    
    // Step 4: Update session status to running
    await updateSessionStatus(sessionId, 'running');
    console.log(`Session ${sessionId} is now running`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Container setup completed successfully',
        sessionId,
        privateIp
      })
    };
    
  } catch (error) {
    console.error(`Container integration failed for session ${sessionId}:`, error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    try {
      await updateSessionStatus(sessionId, 'failed');
    } catch (updateError) {
      console.error('Failed to update session status:', updateError);
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Container setup failed',
        sessionId,
        error: (error as Error).message
      })
    };
  }
};

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
