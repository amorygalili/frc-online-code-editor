// Save Challenge Code Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ChallengeSession, SaveCodeRequest } from '../../types';
import { successResponse, errorResponse, validationErrorResponse, internalErrorResponse, getUserIdFromEvent, parseJsonBody, validateRequiredFields } from '../../utils/response';
import { getItem, updateItem, TABLES, getCurrentTimestamp } from '../../utils/dynamodb';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('saveChallengeCode event:', JSON.stringify(event, null, 2));

    // Extract user ID from Cognito claims
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return errorResponse({
        statusCode: 401,
        message: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
    }

    // Extract session ID from path parameters
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
      return validationErrorResponse('Session ID is required');
    }

    // Parse request body
    const requestBody = parseJsonBody<SaveCodeRequest>(event.body);
    if (!requestBody) {
      return validationErrorResponse('Invalid request body');
    }

    // Validate required fields
    const missingFields = validateRequiredFields(requestBody, ['code']);
    if (missingFields.length > 0) {
      return validationErrorResponse(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log(`Saving code for session ${sessionId} and user ${userId}`);

    // Get existing session
    const session = await getItem<ChallengeSession>(TABLES.CHALLENGE_SESSIONS, { sessionId });
    if (!session) {
      return errorResponse({
        statusCode: 404,
        message: 'Session not found',
        code: 'NOT_FOUND',
      });
    }

    // Verify session belongs to the user
    if (session.userId !== userId) {
      return errorResponse({
        statusCode: 403,
        message: 'Access denied to this session',
        code: 'FORBIDDEN',
      });
    }

    // Check if session is still active
    if (session.status !== 'active') {
      return errorResponse({
        statusCode: 400,
        message: 'Session is not active',
        code: 'SESSION_INACTIVE',
      });
    }

    const now = getCurrentTimestamp();

    // Build update expression
    const updates: string[] = [];
    const attributeValues: Record<string, any> = {};

    updates.push('currentCode = :code');
    updates.push('lastSavedAt = :lastSavedAt');
    attributeValues[':code'] = requestBody.code;
    attributeValues[':lastSavedAt'] = now;

    // Update test results if provided
    if (requestBody.testResults) {
      updates.push('testResults = :testResults');
      attributeValues[':testResults'] = requestBody.testResults;
    }

    const updateExpression = 'SET ' + updates.join(', ');

    const updatedSession = await updateItem(
      TABLES.CHALLENGE_SESSIONS,
      { sessionId },
      updateExpression,
      undefined,
      attributeValues
    );

    console.log(`Saved code for session ${sessionId}`);
    
    return successResponse(updatedSession);

  } catch (error) {
    console.error('saveChallengeCode error:', error);
    return internalErrorResponse('Failed to save challenge code', error);
  }
}
