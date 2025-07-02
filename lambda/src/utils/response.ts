// Response utilities for Lambda functions
import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { ApiError } from '../types';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://frc-online-code-editor.vercel.app',
  'http://localhost:3000'
];

function getCorsHeaders(event?: APIGatewayProxyEvent): Record<string, string> {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0];

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
}

export function successResponse<T>(data: T, statusCode: number = 200, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

export function errorResponse(error: ApiError, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return {
    statusCode: error.statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    }),
  };
}

export function validationErrorResponse(message: string, details?: any, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 400,
    message,
    code: 'VALIDATION_ERROR',
    details,
  }, event);
}

export function notFoundResponse(resource: string, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 404,
    message: `${resource} not found`,
    code: 'NOT_FOUND',
  }, event);
}

export function unauthorizedResponse(message: string = 'Unauthorized', event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 401,
    message,
    code: 'UNAUTHORIZED',
  }, event);
}

export function forbiddenResponse(message: string = 'Forbidden', event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 403,
    message,
    code: 'FORBIDDEN',
  }, event);
}

export function internalErrorResponse(message: string = 'Internal server error', details?: any, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 500,
    message,
    code: 'INTERNAL_ERROR',
    details,
  }, event);
}

export function conflictResponse(message: string, details?: any, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 409,
    message,
    code: 'CONFLICT',
    details,
  }, event);
}

// Helper to parse JSON body safely
export function parseJsonBody<T>(body: string | null): T | null {
  if (!body) return null;
  
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    return null;
  }
}

// Helper to extract user ID from Cognito claims
export function getUserIdFromEvent(event: any): string | null {
  try {
    const claims = event.requestContext?.authorizer?.claims;
    return claims?.sub || claims?.['cognito:username'] || null;
  } catch (error) {
    return null;
  }
}

// Helper to extract user email from Cognito claims
export function getUserEmailFromEvent(event: any): string | null {
  try {
    const claims = event.requestContext?.authorizer?.claims;
    return claims?.email || null;
  } catch (error) {
    return null;
  }
}

// Helper to validate required fields
export function validateRequiredFields(data: any, requiredFields: string[]): string[] {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  }

  return missingFields;
}

// Export CORS headers for direct use
export const corsHeaders = getCorsHeaders();

// Generic response creator
export function createResponse(statusCode: number, body: any, event?: APIGatewayProxyEvent): APIGatewayProxyResult {
  return {
    statusCode,
    headers: getCorsHeaders(event),
    body: JSON.stringify(body)
  };
}

// Alias for parseJsonBody to match import expectations
export const parseJSONBody = parseJsonBody;
