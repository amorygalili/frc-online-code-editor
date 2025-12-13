// Get Single Challenge Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Challenge, ChallengeWithProgress } from '../../types/challenge';
import { UserProgress } from '../../types';
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
      }, event);
    }

    // Extract challenge ID from path parameters
    const challengeId = event.pathParameters?.id;
    if (!challengeId) {
      return errorResponse({
        statusCode: 400,
        message: 'Challenge ID is required',
        code: 'VALIDATION_ERROR',
      }, event);
    }

    console.log(`Getting challenge ${challengeId} for user ${userId}`);

    // Get challenge from DynamoDB
    const challenge = await getItem<Challenge>(TABLES.CHALLENGES, { id: challengeId });

    if (!challenge) {
      return notFoundResponse('Challenge', event);
    }

    // Get user progress for this challenge
    const userProgress = await getItem<UserProgress>(TABLES.USER_PROGRESS, {
      userId,
      challengeId,
    });

    // Combine challenge with user progress (simplified - no prerequisites check)
    const challengeWithProgress: ChallengeWithProgress = {
      ...challenge,
      userProgress: userProgress ? {
        status: userProgress.status,
        completedAt: userProgress.completedAt,
      } : undefined,
    };

    console.log(`Returning challenge ${challengeId} with progress:`, challengeWithProgress.userProgress?.status);

    return successResponse(challengeWithProgress, 200, event);

  } catch (error) {
    console.error('getChallenge error:', error);
    return internalErrorResponse('Failed to get challenge', error, event);
  }
}

// Removed checkPrerequisites function - prerequisites no longer in schema
