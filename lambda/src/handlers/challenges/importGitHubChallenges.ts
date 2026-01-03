// Lambda handler for importing challenges from GitHub repositories

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import { GitHubChallengeService } from '../../services/githubChallengeService';
import {
  ImportChallengeRepositoryRequest,
  ImportChallengeRepositoryResponse,
  Challenge
} from '../../types/challenge';
import { GitHubChallengeRepository } from '../../schemas/github-challenge-schemas';
import { createResponse, errorResponse } from '../../utils/response';
import { getUserId } from '../../utils/auth';
import { config } from '../../config';
import { dynamoDb } from '../../utils/dynamodb';

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
      parsedRepo.metadata,
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
  repoMetadata: GitHubChallengeRepository,
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
      const challengeId = uuidv4();

      // Include instructions content in metadata.files if available
      const metadataWithContent = {
        ...challenge.metadata,
        files: {
          ...challenge.metadata.files,
          instructionsContent: challenge.files?.instructions?.content || '',
        },
      };

      const challengeEntity: Challenge = {
        id: challengeId,
        // Git repository fields
        github: {
          url: githubUrl,
          branch,
          repositoryId,
          challengePath: challenge.challengePath, // Use the actual challenge path
          // Repository metadata from challenges.json
          name: repoMetadata.name,
          description: repoMetadata.description,
          author: repoMetadata.author,
        },
        // Metadata from the challenge (contains title, description, files, and instructionsContent)
        metadata: metadataWithContent,
        // Standard fields
        createdAt: now,
        updatedAt: now
      };

      console.log('Importing challenge entity:', JSON.stringify(challengeEntity, null, 2));

      const command = new PutCommand({
        TableName: config.tables.challenges,
        Item: challengeEntity
      });

      await dynamoDb.send(command);

      successful.push({
        id: challengeId,
        title: challenge.metadata.title
      });

    } catch (error) {
      console.error(`Failed to import challenge ${challenge.challengePath}:`, error);
      failed.push({
        id: challenge.challengePath || 'unknown',
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
