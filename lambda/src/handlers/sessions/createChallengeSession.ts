// Create Challenge Session Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { ChallengeSession, Challenge } from '../../types';
import { successResponse, errorResponse, validationErrorResponse, internalErrorResponse, getUserIdFromEvent } from '../../utils/response';
import { getItem, putItem, TABLES, getCurrentTimestamp, getTTL } from '../../utils/dynamodb';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('createChallengeSession event:', JSON.stringify(event, null, 2));

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
      return validationErrorResponse('Challenge ID is required');
    }

    console.log(`Creating session for challenge ${challengeId} and user ${userId}`);

    // Verify challenge exists and is published
    const challenge = await getItem<Challenge>(TABLES.CHALLENGES, { id: challengeId });
    if (!challenge) {
      return errorResponse({
        statusCode: 404,
        message: 'Challenge not found',
        code: 'NOT_FOUND',
      });
    }

    if (!challenge.isPublished) {
      return errorResponse({
        statusCode: 404,
        message: 'Challenge not available',
        code: 'NOT_FOUND',
      });
    }

    // Create new session
    const sessionId = uuidv4();
    const now = getCurrentTimestamp();
    
    const session: ChallengeSession = {
      sessionId,
      userId,
      challengeId,
      currentCode: challenge.starterCode || '',
      status: 'active',
      startedAt: now,
      lastSavedAt: now,
      testResults: [],
    };

    // Add GSI keys for querying
    const sessionItem = {
      ...session,
      GSI1PK: userId, // For user index
      GSI2PK: challengeId, // For challenge index
      TTL: getTTL(24), // Session expires in 24 hours
    };

    await putItem(TABLES.CHALLENGE_SESSIONS, sessionItem);

    console.log(`Created session ${sessionId} for challenge ${challengeId}`);
    
    return successResponse(session);

  } catch (error) {
    console.error('createChallengeSession error:', error);
    return internalErrorResponse('Failed to create challenge session', error);
  }
}
