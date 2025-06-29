// Configuration management for Lambda functions
import * as dotenv from 'dotenv';

// Load environment variables from .env file (for local development)
dotenv.config();

export const config = {
  // AWS Configuration
  region: process.env.AWS_REGION || process.env.REGION || 'us-east-1',
  stage: process.env.STAGE || 'dev',
  
  // Cognito Configuration
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
  
  // DynamoDB Table Names
  tables: {
    challenges: process.env.CHALLENGES_TABLE || 'frc-challenge-api-challenges-dev',
    userProgress: process.env.USER_PROGRESS_TABLE || 'frc-challenge-api-user-progress-dev',
    challengeSessions: process.env.CHALLENGE_SESSIONS_TABLE || 'frc-challenge-api-challenge-sessions-dev',
  },
  
  // API Configuration
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  
  // Development flags
  isDevelopment: process.env.NODE_ENV !== 'production',
  isLocal: process.env.IS_OFFLINE === 'true',
};

// Validation function to ensure required config is present
export function validateConfig(): void {
  const requiredVars = [
    'COGNITO_USER_POOL_ID',
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Log configuration (excluding sensitive data)
export function logConfig(): void {
  console.log('Configuration loaded:', {
    region: config.region,
    stage: config.stage,
    tables: config.tables,
    isDevelopment: config.isDevelopment,
    isLocal: config.isLocal,
    cognitoUserPoolId: config.cognitoUserPoolId ? '***configured***' : 'NOT SET',
  });
}
