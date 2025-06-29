// Response utilities for Lambda functions
import { APIGatewayProxyResult } from 'aws-lambda';
import { ApiError } from '../types';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export function successResponse<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      data,
    }),
  };
}

export function errorResponse(error: ApiError): APIGatewayProxyResult {
  return {
    statusCode: error.statusCode,
    headers: CORS_HEADERS,
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

export function validationErrorResponse(message: string, details?: any): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 400,
    message,
    code: 'VALIDATION_ERROR',
    details,
  });
}

export function notFoundResponse(resource: string): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 404,
    message: `${resource} not found`,
    code: 'NOT_FOUND',
  });
}

export function unauthorizedResponse(message: string = 'Unauthorized'): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 401,
    message,
    code: 'UNAUTHORIZED',
  });
}

export function forbiddenResponse(message: string = 'Forbidden'): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 403,
    message,
    code: 'FORBIDDEN',
  });
}

export function internalErrorResponse(message: string = 'Internal server error', details?: any): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 500,
    message,
    code: 'INTERNAL_ERROR',
    details,
  });
}

export function conflictResponse(message: string, details?: any): APIGatewayProxyResult {
  return errorResponse({
    statusCode: 409,
    message,
    code: 'CONFLICT',
    details,
  });
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
