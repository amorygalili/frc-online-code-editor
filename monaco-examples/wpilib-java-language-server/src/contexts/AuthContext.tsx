import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { isAuthConfigured } from '../config/auth';

// Types for our authentication context
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);



// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isAuthConfigured();

  // Debug environment variables on initialization
  console.log('Auth Provider initialized with environment variables:', {
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    clientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    redirectSignIn: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN,
    redirectSignOut: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT,
    configured: configured,
    windowOrigin: window.location.origin,
    currentUrl: window.location.href
  });

  // Convert Cognito user to our User type
  const mapCognitoUser = async (cognitoUser: any): Promise<User> => {
    try {
      // Get user attributes which contain the actual user info from Google
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;

      // Extract user info from ID token payload
      let userInfo = {
        id: cognitoUser.userId || cognitoUser.username || '',
        email: '',
        name: 'User',
        avatar: ''
      };

      if (idToken) {
        const payload = idToken.payload;
        userInfo = {
          id: cognitoUser.userId || cognitoUser.username || '',
          email: payload.email as string || '',
          name: payload.name as string || payload.given_name as string || payload.email as string || 'User',
          avatar: payload.picture as string || ''
        };
      }

      console.log('Mapped user info:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('Error mapping user:', error);
      // Fallback to basic info
      return {
        id: cognitoUser.userId || cognitoUser.username || '',
        email: cognitoUser.signInDetails?.loginId || '',
        name: cognitoUser.signInDetails?.loginId || 'User',
        avatar: '',
      };
    }
  };

  // Check current authentication status
  const checkAuthState = useCallback(async () => {
    if (!configured) {
      // Authentication is required but not configured
      console.log('AWS Cognito not configured - authentication required');
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Checking authentication state...');

      // First check if we have a valid session (more semantic than getCurrentUser)
      const session = await fetchAuthSession();
      console.log('Session fetched:', { hasTokens: !!session.tokens, session });

      // If we have tokens, get the user details
      if (session.tokens) {
        console.log('Valid session found, getting user details...');
        const cognitoUser = await getCurrentUser();
        console.log('Cognito user:', cognitoUser);

        const mappedUser = await mapCognitoUser(cognitoUser);
        console.log('User successfully mapped and authenticated:', mappedUser);
        setUser(mappedUser);
      } else {
        // No valid session
        console.log('No valid session tokens found');
        setUser(null);
      }
    } catch (error) {
      // No authenticated session - this is expected when not logged in
      console.error('Authentication check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [configured]);

  // Sign in function
  const handleSignIn = useCallback(async () => {
    if (!configured) {
      // No authentication configured
      console.log('Authentication not configured - cannot sign in');
      throw new Error('Authentication is not configured. Please set up AWS Cognito to enable sign in.');
    }

    try {
      // Use Cognito Hosted UI for Google OAuth
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, [configured]);

  // Sign out function
  const handleSignOut = useCallback(async () => {
    if (!configured) {
      // Authentication not configured - nothing to sign out from
      console.log('Authentication not configured - no sign out needed');
      setUser(null);
      return;
    }

    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [configured]);

  // Listen for authentication events
  useEffect(() => {
    // Only check auth state on mount
    checkAuthState();

    // Only set up Hub listener if configured
    if (configured) {
      // Listen for auth state changes
      const unsubscribe = Hub.listen('auth', ({ payload }) => {
        const { event } = payload;
        console.log('Auth Hub event received:', event, payload);

        switch (event) {
          case 'signedIn':
            console.log('User signed in successfully');
            checkAuthState();
            break;
          case 'signInWithRedirect':
            console.log('Sign in with redirect completed');
            checkAuthState();
            break;
          case 'signedOut':
            console.log('User signed out');
            setUser(null);
            break;
          case 'signInWithRedirect_failure':
            console.error('Authentication failed:', payload);
            setUser(null);
            break;
          default:
            console.log('Unhandled auth event:', event, payload);
        }
      });

      return unsubscribe;
    }
  }, [configured, checkAuthState]);

  // Handle OAuth callback
  useEffect(() => {
    if (configured) {
      // Check if we're returning from OAuth
      const urlParams = new URLSearchParams(window.location.search);
      console.log('Checking URL params:', window.location.search);
      console.log('Full URL:', window.location.href);

      if (urlParams.get('code')) {
        console.log('OAuth callback detected with code:', urlParams.get('code'));
        console.log('State parameter:', urlParams.get('state'));

        // Don't clear URL parameters immediately - let Amplify process them first
        console.log('Waiting for Amplify to process OAuth callback...');

        // Give Amplify time to process the callback before checking auth state
        setTimeout(() => {
          console.log('Checking auth state after OAuth callback...');
          checkAuthState();
          // Clear the URL parameters after processing
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 1000);
      } else if (urlParams.get('error')) {
        console.error('OAuth callback error:', urlParams.get('error'), urlParams.get('error_description'));
      }
    }
  }, [configured, checkAuthState]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signOut: handleSignOut,
    isConfigured: configured,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
