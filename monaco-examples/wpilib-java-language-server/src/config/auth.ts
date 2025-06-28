// AWS Amplify Authentication Configuration
import { Amplify } from 'aws-amplify';

// Environment variables for AWS Cognito
const awsConfig = {
  Auth: {
    Cognito: {
      // AWS Region
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',

      // Cognito User Pool ID
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',

      // Cognito User Pool App Client ID
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',

      // Cognito Hosted UI configuration
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN?.replace('https://', '') || '',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: [import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN || window.location.origin],
          redirectSignOut: [import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT || window.location.origin],
          responseType: 'code' as const,
          providers: ['Google' as const],
        },
      },
    },
  },
};

// Initialize Amplify with configuration
export const configureAuth = () => {
  // Check if required environment variables are present
  const requiredVars = [
    'VITE_COGNITO_USER_POOL_ID',
    'VITE_COGNITO_USER_POOL_CLIENT_ID',
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.log('Missing required environment variables for authentication:', missingVars);
    console.log('Authentication is not configured. Please set up AWS Cognito.');
    return false;
  }

  try {
    // Only configure if we have valid values
    const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
    const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;

    if (userPoolId && clientId) {
      Amplify.configure(awsConfig);
      console.log('AWS Amplify configured successfully');
      return true;
    } else {
      console.log('AWS Cognito not configured - authentication disabled');
      return false;
    }
  } catch (error) {
    console.error('Failed to configure AWS Amplify:', error);
    console.log('Authentication disabled due to configuration error');
    return false;
  }
};

// Export configuration for reference
export { awsConfig };

// Helper function to check if auth is properly configured
export const isAuthConfigured = () => {
  return !!(
    import.meta.env.VITE_COGNITO_USER_POOL_ID &&
    import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID
  );
};

// Debug function to check environment variables (temporary)
export const debugEnvVars = () => {
  const envVars = {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    clientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    redirectSignIn: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN,
    redirectSignOut: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT,
    region: import.meta.env.VITE_AWS_REGION,
    actualRedirectSignIn: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN || window.location.origin,
    actualRedirectSignOut: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT || window.location.origin,
    windowOrigin: window.location.origin,
    allEnvVars: import.meta.env
  };
  console.log('Environment Variables Debug:', envVars);
  return envVars;
};

// Make debug function available globally (temporary)
(window as any).debugEnvVars = debugEnvVars;
