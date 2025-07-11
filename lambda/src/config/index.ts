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

  // ECS Configuration
  ecs: {
    clusterName: process.env.ECS_CLUSTER_NAME || 'frc-challenge-site-dev-cluster',
    taskDefinition: process.env.ECS_TASK_DEFINITION || 'frc-challenge-runtime',
    securityGroup: process.env.CHALLENGE_RUNTIME_SECURITY_GROUP || '',
    privateSubnet1: process.env.PRIVATE_SUBNET_1 || '',
    privateSubnet2: process.env.PRIVATE_SUBNET_2 || '',
  },

  // ALB Configuration
  alb: {
    listenerArn: process.env.ALB_LISTENER_ARN || '',
    httpsListenerArn: process.env.ALB_HTTPS_LISTENER_ARN || '',
    targetGroupArn: process.env.ALB_TARGET_GROUP_ARN || '',
    dnsName: process.env.ALB_DNS_NAME || '',
    vpcId: process.env.VPC_ID || '',
    sslCertificateArn: process.env.SSL_CERTIFICATE_ARN || '',
  },

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
