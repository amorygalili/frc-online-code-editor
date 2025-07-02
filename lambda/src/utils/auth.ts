import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';

export interface User {
  sub: string;
  email: string;
  name?: string;
  'cognito:username': string;
}

/**
 * Extract user information from JWT token in API Gateway event
 */
export function getUserFromEvent(event: APIGatewayProxyEvent): User | null {
  try {
    // Check for Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      console.log('No Authorization header found');
      return null;
    }

    // Extract token from Bearer header
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      console.log('No token found in Authorization header');
      return null;
    }

    // For AWS Cognito JWT tokens, we can decode without verification
    // since API Gateway already validates the token
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      console.log('Failed to decode JWT token');
      return null;
    }

    // Extract user information from token
    const user: User = {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      'cognito:username': decoded['cognito:username']
    };

    console.log('User extracted from token:', { sub: user.sub, email: user.email });
    return user;

  } catch (error) {
    console.error('Error extracting user from event:', error);
    return null;
  }
}

/**
 * Get user ID from event (uses sub claim from JWT)
 */
export function getUserId(event: APIGatewayProxyEvent): string | null {
  const user = getUserFromEvent(event);
  return user?.sub || null;
}

/**
 * Validate that user is authenticated
 */
export function requireAuth(event: APIGatewayProxyEvent): User {
  const user = getUserFromEvent(event);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
