// Get Single Challenge Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Challenge, UserProgress, ChallengeWithProgress } from '../../types';
import { successResponse, errorResponse, notFoundResponse, internalErrorResponse, getUserIdFromEvent } from '../../utils/response';
import { getItem, TABLES } from '../../utils/dynamodb';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('getChallenge event:', JSON.stringify(event, null, 2));

    // Extract user ID from Cognito claims
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return errorResponse({
        statusCode: 401,
        message: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
    }

    // Extract challenge ID from path parameters
    const challengeId = event.pathParameters?.id;
    if (!challengeId) {
      return errorResponse({
        statusCode: 400,
        message: 'Challenge ID is required',
        code: 'VALIDATION_ERROR',
      });
    }

    console.log(`Getting challenge ${challengeId} for user ${userId}`);

    // Get challenge from DynamoDB
    const challenge = await getItem<Challenge>(TABLES.CHALLENGES, { id: challengeId });
    
    if (!challenge) {
      return notFoundResponse('Challenge');
    }

    // Check if challenge is published
    if (!challenge.isPublished) {
      return notFoundResponse('Challenge');
    }

    // Get user progress for this challenge
    const userProgress = await getItem<UserProgress>(TABLES.USER_PROGRESS, {
      userId,
      challengeId,
    });

    // Check if user meets prerequisites
    const hasPrerequisites = await checkPrerequisites(userId, challenge.prerequisites || []);
    
    // Combine challenge with user progress
    const challengeWithProgress: ChallengeWithProgress = {
      ...challenge,
      userProgress: userProgress || undefined,
    };

    // If user doesn't meet prerequisites, mark as locked
    if (!hasPrerequisites && !userProgress) {
      // Create a locked progress entry
      challengeWithProgress.userProgress = {
        userId,
        challengeId,
        status: 'not_started',
        progress: 0,
        timeSpent: 0,
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    console.log(`Returning challenge ${challengeId} with progress:`, challengeWithProgress.userProgress?.status);
    
    return successResponse(challengeWithProgress);

  } catch (error) {
    console.error('getChallenge error:', error);
    return internalErrorResponse('Failed to get challenge', error);
  }
}

async function checkPrerequisites(userId: string, prerequisites: string[]): Promise<boolean> {
  if (prerequisites.length === 0) {
    return true; // No prerequisites required
  }

  try {
    // Check if all prerequisites are completed
    for (const prereqId of prerequisites) {
      const progress = await getItem<UserProgress>(TABLES.USER_PROGRESS, {
        userId,
        challengeId: prereqId,
      });

      if (!progress || progress.status !== 'completed') {
        return false; // Prerequisite not completed
      }
    }

    return true; // All prerequisites completed
  } catch (error) {
    console.error('Error checking prerequisites:', error);
    return false; // Assume prerequisites not met on error
  }
}
