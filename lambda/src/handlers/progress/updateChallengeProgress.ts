// Update Challenge Progress Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserProgress, UpdateProgressRequest } from '../../types';
import { successResponse, errorResponse, validationErrorResponse, internalErrorResponse, getUserIdFromEvent, parseJsonBody } from '../../utils/response';
import { getItem, putItem, updateItem, TABLES, getCurrentTimestamp } from '../../utils/dynamodb';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('updateChallengeProgress event:', JSON.stringify(event, null, 2));

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

    // Parse request body
    const requestBody = parseJsonBody<UpdateProgressRequest>(event.body);
    if (!requestBody) {
      return validationErrorResponse('Invalid request body');
    }

    console.log(`Updating progress for challenge ${challengeId} and user ${userId}:`, requestBody);

    // Validate request
    const validationError = validateUpdateProgressRequest(requestBody);
    if (validationError) {
      return validationErrorResponse(validationError);
    }

    // Check if challenge exists
    const challenge = await getItem(TABLES.CHALLENGES, { id: challengeId });
    if (!challenge) {
      return errorResponse({
        statusCode: 404,
        message: 'Challenge not found',
        code: 'NOT_FOUND',
      });
    }

    // Get existing progress or create new one
    let existingProgress = await getItem<UserProgress>(TABLES.USER_PROGRESS, {
      userId,
      challengeId,
    });

    const now = getCurrentTimestamp();

    if (existingProgress) {
      // Update existing progress
      const updatedProgress = await updateExistingProgress(existingProgress, requestBody, now);
      return successResponse(updatedProgress);
    } else {
      // Create new progress record
      const newProgress = await createNewProgress(userId, challengeId, requestBody, now);
      return successResponse(newProgress);
    }

  } catch (error) {
    console.error('updateChallengeProgress error:', error);
    return internalErrorResponse('Failed to update challenge progress', error);
  }
}

function validateUpdateProgressRequest(request: UpdateProgressRequest): string | null {
  // Validate status
  if (request.status && !['not_started', 'in_progress', 'completed'].includes(request.status)) {
    return 'Invalid status. Must be one of: not_started, in_progress, completed';
  }

  // Validate progress
  if (request.progress !== undefined && (request.progress < 0 || request.progress > 100)) {
    return 'Progress must be between 0 and 100';
  }

  // Validate timeSpent
  if (request.timeSpent !== undefined && request.timeSpent < 0) {
    return 'Time spent cannot be negative';
  }

  return null;
}

async function updateExistingProgress(
  existingProgress: UserProgress,
  request: UpdateProgressRequest,
  timestamp: string
): Promise<UserProgress> {
  const updates: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, any> = {};

  // Build update expression
  if (request.status !== undefined) {
    updates.push('#status = :status');
    attributeNames['#status'] = 'status';
    attributeValues[':status'] = request.status;
  }

  if (request.progress !== undefined) {
    updates.push('progress = :progress');
    attributeValues[':progress'] = request.progress;
  }

  if (request.lastCode !== undefined) {
    updates.push('lastCode = :lastCode');
    attributeValues[':lastCode'] = request.lastCode;
  }

  if (request.timeSpent !== undefined) {
    updates.push('timeSpent = timeSpent + :additionalTime');
    attributeValues[':additionalTime'] = request.timeSpent;
  }

  // Always update the timestamp and increment attempts
  updates.push('updatedAt = :updatedAt');
  updates.push('attempts = attempts + :one');
  attributeValues[':updatedAt'] = timestamp;
  attributeValues[':one'] = 1;

  // Set completion timestamp if status is completed
  if (request.status === 'completed') {
    updates.push('completedAt = :completedAt');
    attributeValues[':completedAt'] = timestamp;
  }

  const updateExpression = 'SET ' + updates.join(', ');

  const updatedItem = await updateItem(
    TABLES.USER_PROGRESS,
    { userId: existingProgress.userId, challengeId: existingProgress.challengeId },
    updateExpression,
    Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
    attributeValues
  );

  return updatedItem as UserProgress;
}

async function createNewProgress(
  userId: string,
  challengeId: string,
  request: UpdateProgressRequest,
  timestamp: string
): Promise<UserProgress> {
  const newProgress: UserProgress = {
    userId,
    challengeId,
    status: request.status || 'not_started',
    progress: request.progress || 0,
    lastCode: request.lastCode,
    timeSpent: request.timeSpent || 0,
    attempts: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Set completion timestamp if status is completed
  if (newProgress.status === 'completed') {
    newProgress.completedAt = timestamp;
  }

  await putItem(TABLES.USER_PROGRESS, newProgress);

  return newProgress;
}
