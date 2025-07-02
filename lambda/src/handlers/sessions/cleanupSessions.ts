import { ScheduledEvent } from 'aws-lambda';
import { ECSClient, StopTaskCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';

const ecsClient = new ECSClient({ region: config.region });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

interface CleanupResult {
  expiredSessions: number;
  orphanedTasks: number;
  failedCleanups: number;
  errors: string[];
}

export const handler = async (event: ScheduledEvent): Promise<CleanupResult> => {
  console.log('Starting session cleanup:', JSON.stringify(event, null, 2));

  const result: CleanupResult = {
    expiredSessions: 0,
    orphanedTasks: 0,
    failedCleanups: 0,
    errors: []
  };

  try {
    // Get all active sessions from DynamoDB
    const activeSessions = await getActiveSessions();
    console.log(`Found ${activeSessions.length} active sessions`);

    const now = new Date();
    const expiredSessions = activeSessions.filter(session => {
      const expiresAt = new Date(session.expiresAt);
      const lastActivity = new Date(session.lastActivity);
      
      // Session is expired if:
      // 1. Past expiration time, OR
      // 2. No activity for more than idle timeout (30 minutes)
      const isExpired = now > expiresAt;
      const isIdle = (now.getTime() - lastActivity.getTime()) > (30 * 60 * 1000); // 30 minutes
      
      return isExpired || isIdle;
    });

    console.log(`Found ${expiredSessions.length} expired/idle sessions`);

    // Clean up expired sessions
    for (const session of expiredSessions) {
      try {
        await cleanupSession(session);
        result.expiredSessions++;
        console.log(`Cleaned up session: ${session.sessionId}`);
      } catch (error) {
        result.failedCleanups++;
        result.errors.push(`Failed to cleanup session ${session.sessionId}: ${error.message}`);
        console.error(`Failed to cleanup session ${session.sessionId}:`, error);
      }
    }

    // Check for orphaned ECS tasks (tasks running without corresponding DB records)
    await cleanupOrphanedTasks(result);

    console.log('Session cleanup completed:', result);
    return result;

  } catch (error) {
    console.error('Error during session cleanup:', error);
    result.errors.push(`Cleanup process error: ${error.message}`);
    return result;
  }
};

async function getActiveSessions() {
  const sessions = [];
  let lastEvaluatedKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: config.tables.challengeSessions,
      FilterExpression: '#status IN (:starting, :running)',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':starting': 'starting',
        ':running': 'running'
      },
      ExclusiveStartKey: lastEvaluatedKey
    });

    const result = await dynamoClient.send(command);
    sessions.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return sessions;
}

async function cleanupSession(session: any) {
  // Stop the ECS task if it exists
  if (session.taskArn) {
    try {
      const stopCommand = new StopTaskCommand({
        cluster: process.env.ECS_CLUSTER_NAME || 'frc-challenge-cluster',
        task: session.taskArn,
        reason: 'Session expired - automatic cleanup'
      });
      
      await ecsClient.send(stopCommand);
      console.log(`Stopped ECS task: ${session.taskArn}`);
    } catch (error) {
      // Task might already be stopped or not exist
      console.warn(`Could not stop task ${session.taskArn}:`, error.message);
    }
  }

  // Update session status in DynamoDB
  const updateCommand = new UpdateCommand({
    TableName: config.tables.challengeSessions,
    Key: { sessionId: session.sessionId },
    UpdateExpression: 'SET #status = :status, terminatedAt = :terminatedAt, terminationReason = :reason',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'stopped',
      ':terminatedAt': new Date().toISOString(),
      ':reason': 'expired'
    }
  });

  await dynamoClient.send(updateCommand);
}

async function cleanupOrphanedTasks(result: CleanupResult) {
  try {
    // Get all running tasks in the cluster
    const listTasksCommand = {
      cluster: process.env.ECS_CLUSTER_NAME || 'frc-challenge-cluster',
      desiredStatus: 'RUNNING'
    };

    // Note: In a real implementation, you'd need to use ListTasksCommand
    // and then DescribeTasksCommand to get task details
    // This is a simplified version

    console.log('Orphaned task cleanup would be implemented here');
    // TODO: Implement orphaned task detection and cleanup
    
  } catch (error) {
    console.error('Error checking for orphaned tasks:', error);
    result.errors.push(`Orphaned task check error: ${error.message}`);
  }
}

// Helper function to manually trigger cleanup (for testing)
export const manualCleanup = async (): Promise<CleanupResult> => {
  const mockEvent: ScheduledEvent = {
    version: '0',
    id: 'manual-cleanup',
    'detail-type': 'Manual Cleanup',
    source: 'lambda.manual',
    account: '',
    time: new Date().toISOString(),
    region: config.region,
    detail: {},
    resources: []
  };

  return handler(mockEvent);
};
