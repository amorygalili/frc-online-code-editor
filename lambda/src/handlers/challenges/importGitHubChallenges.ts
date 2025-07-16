// Lambda handler for importing challenges from GitHub repositories

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import { GitHubChallengeService } from '../../services/githubChallengeService';
import {
  ImportChallengeRepositoryRequest,
  ImportChallengeRepositoryResponse
} from '../../types/challenge';
import { createResponse, errorResponse } from '../../utils/response';
import { getUserFromEvent } from '../../utils/auth';
import { config } from '../../config';

const dynamoClient = new DynamoDBClient({ region: config.region });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Import GitHub challenges request:', JSON.stringify(event, null, 2));

    // Get authenticated user
    const userId = getUserFromEvent(event);
    if (!userId) {
      return errorResponse({
        statusCode: 401,
        message: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}') as ImportChallengeRepositoryRequest;
    
    const validationResult = validateImportRequest(body);
    if (!validationResult.valid) {
      return errorResponse({
        statusCode: 400,
        message: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: validationResult.errors
      });
    }

    const { githubUrl, branch = 'main', accessToken } = body;

    // Check if repository is already imported
    const existingRepo = await getExistingRepository(githubUrl, branch);
    if (existingRepo) {
      return errorResponse({
        statusCode: 409,
        message: 'Repository already imported',
        code: 'ALREADY_EXISTS',
        details: { repositoryId: existingRepo.id }
      });
    }

    // Initialize GitHub service
    const githubService = new GitHubChallengeService(accessToken);

    // Validate repository structure
    const validation = await githubService.validateRepository(githubUrl, branch);
    if (!validation.valid) {
      return errorResponse({
        statusCode: 400,
        message: 'Invalid repository structure',
        code: 'INVALID_REPOSITORY',
        details: validation.errors
      });
    }

    // Parse repository and challenges
    const parsedRepo = await githubService.parseRepository(githubUrl, branch);
    
    // Create repository record
    const repositoryId = uuidv4();
    const now = new Date().toISOString();
    
    const repositoryEntity: ChallengeRepositoryEntity = {
      id: repositoryId,
      githubUrl,
      branch,
      repositoryMetadata: parsedRepo.metadata,
      importStatus: 'imported',
      lastImport: now,
      importedBy: userId,
      createdAt: now
    };

    // Save repository to database
    await saveRepository(repositoryEntity);

    // Import individual challenges
    const challengeResults = await importChallenges(
      repositoryId, 
      githubUrl, 
      branch, 
      parsedRepo.challenges
    );

    // Prepare response
    const response: ImportChallengeRepositoryResponse = {
      repositoryId,
      status: 'success',
      message: `Successfully imported ${challengeResults.successful.length} challenges`,
      challengesFound: parsedRepo.challenges.length,
      challenges: [
        ...challengeResults.successful.map(c => ({
          id: c.id,
          title: c.title,
          status: 'imported' as const
        })),
        ...challengeResults.failed.map(f => ({
          id: f.id,
          title: f.title || f.id,
          status: 'error' as const,
          error: f.error
        }))
      ]
    };

    console.log('Import completed:', response);
    return createResponse(201, response, event);

  } catch (error) {
    console.error('Error importing GitHub challenges:', error);
    return errorResponse({
      statusCode: 500,
      message: 'Failed to import challenges',
      code: 'IMPORT_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

async function getExistingRepository(githubUrl: string, branch: string): Promise<ChallengeRepositoryEntity | null> {
  const command = new QueryCommand({
    TableName: config.tables.challengeRepositories,
    IndexName: 'GitHubUrlIndex', // Assuming we create this GSI
    KeyConditionExpression: 'githubUrl = :url AND #branch = :branch',
    ExpressionAttributeNames: {
      '#branch': 'branch'
    },
    ExpressionAttributeValues: marshall({
      ':url': githubUrl,
      ':branch': branch
    })
  });

  try {
    const result = await dynamoClient.send(command);
    if (result.Items && result.Items.length > 0) {
      return unmarshall(result.Items[0]) as ChallengeRepositoryEntity;
    }
    return null;
  } catch (error) {
    console.error('Error checking existing repository:', error);
    return null;
  }
}

async function saveRepository(repository: ChallengeRepositoryEntity): Promise<void> {
  const command = new PutCommand({
    TableName: config.tables.challengeRepositories,
    Item: marshall(repository),
    ConditionExpression: 'attribute_not_exists(id)'
  });

  await dynamoClient.send(command);
}

async function importChallenges(
  repositoryId: string,
  githubUrl: string,
  branch: string,
  challenges: any[]
): Promise<{
  successful: { id: string; title: string }[];
  failed: { id: string; title?: string; error: string }[];
}> {
  const successful: { id: string; title: string }[] = [];
  const failed: { id: string; title?: string; error: string }[] = [];

  for (const challenge of challenges) {
    try {
      const challengeEntity: GitHubChallengeEntity = {
        id: uuidv4(),
        githubUrl,
        branch,
        challengeId: challenge.metadata.id,
        repositoryName: challenge.metadata.title,
        lastSynced: new Date().toISOString(),
        syncStatus: 'synced',
        metadata: challenge.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const command = new PutCommand({
        TableName: config.tables.githubChallenges,
        Item: marshall(challengeEntity)
      });

      await dynamoClient.send(command);
      
      successful.push({
        id: challenge.metadata.id,
        title: challenge.metadata.title
      });

    } catch (error) {
      console.error(`Failed to import challenge ${challenge.metadata?.id}:`, error);
      failed.push({
        id: challenge.metadata?.id || 'unknown',
        title: challenge.metadata?.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { successful, failed };
}

function validateImportRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.githubUrl || typeof body.githubUrl !== 'string') {
    errors.push('githubUrl is required and must be a string');
  }

  if (body.branch && typeof body.branch !== 'string') {
    errors.push('branch must be a string');
  }

  if (body.accessToken && typeof body.accessToken !== 'string') {
    errors.push('accessToken must be a string');
  }

  // Validate GitHub URL format
  if (body.githubUrl) {
    const githubUrlPattern = /^https:\/\/github\.com\/[^\/]+\/[^\/]+/;
    if (!githubUrlPattern.test(body.githubUrl)) {
      errors.push('Invalid GitHub URL format');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
