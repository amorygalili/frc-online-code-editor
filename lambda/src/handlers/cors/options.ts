import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://frc-online-code-editor.vercel.app',
  'http://localhost:3000'
];

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Access-Control-Allow-Credentials': 'true'
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const origin = event.headers.origin || event.headers.Origin;
  
  // Check if origin is allowed
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : ALLOWED_ORIGINS[0];
  
  return {
    statusCode: 200,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Origin': allowedOrigin || ALLOWED_ORIGINS[0],
    },
    body: '',
  };
};
