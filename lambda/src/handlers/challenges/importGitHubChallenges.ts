// Lambda handler for importing challenges from GitHub repositories

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import { GitHubChallengeService } from '../../services/githubChallengeService';
import {
  ImportChallengeRepositoryRequest,
  ImportChallengeRepositoryResponse,
  Challenge
} from '../../types/challenge';
import { createResponse, errorResponse } from '../../utils/response';
import { getUserId } from '../../utils/auth';
import { config } from '../../config';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Import GitHub challenges request:', JSON.stringify(event, null, 2));

    // Get authenticated user
    const userId = getUserId(event);
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

    // Generate repository ID for grouping challenges
    const repositoryId = uuidv4();

    // Import individual challenges to unified challenges table
    const challengeResults = await importChallenges(
      repositoryId,
      githubUrl,
      branch,
      parsedRepo.challenges,
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

// Removed old repository functions - now using unified challenges table

async function importChallenges(
  repositoryId: string,
  githubUrl: string,
  branch: string,
  challenges: any[],
): Promise<{
  successful: { id: string; title: string }[];
  failed: { id: string; title?: string; error: string }[];
}> {
  const successful: { id: string; title: string }[] = [];
  const failed: { id: string; title?: string; error: string }[] = [];

  for (const challenge of challenges) {
    try {
      const now = new Date().toISOString();
      const challengeEntity: Challenge = {
        id: uuidv4(),
        title: challenge.metadata.title || 'Untitled Challenge',
        description: challenge.metadata.description || '',
        difficulty: challenge.metadata.difficulty || 'Beginner',
        category: challenge.metadata.category || 'General',
        estimatedTime: challenge.metadata.estimatedTime || '30 min',
        version: challenge.metadata.version || '1.0',
        prerequisites: challenge.metadata.prerequisites || [],
        tags: challenge.metadata.tags || [],
        // Git repository fields
        githubUrl,
        githubBranch: branch,
        repositoryId,
        challengePath: `challenges/${challenge.metadata.id}`, // Assuming standard path structure
        // Metadata from the challenge
        metadata: challenge.metadata,
        // Sync information
        lastSynced: now,
        syncStatus: 'synced',
        // Standard fields
        isPublished: true,
        createdAt: now,
        updatedAt: now
      };

      console.log('Importing challenge entity:', JSON.stringify(challengeEntity, null, 2));

      const command = new PutCommand({
        TableName: config.tables.challenges,
        Item: challengeEntity
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
