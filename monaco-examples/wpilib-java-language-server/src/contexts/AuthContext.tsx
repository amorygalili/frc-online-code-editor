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

  // Convert Cognito user to our User type
  const mapCognitoUser = (cognitoUser: any): User => {
    const attributes = cognitoUser.signInDetails?.loginId || cognitoUser.username || '';
    return {
      id: cognitoUser.userId || cognitoUser.username || '',
      email: attributes || cognitoUser.signInDetails?.loginId || '',
      name: cognitoUser.signInDetails?.loginId || 'User',
      avatar: '',
    };
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

      // First check if we have a valid session (more semantic than getCurrentUser)
      const session = await fetchAuthSession();

      // If we have tokens, get the user details
      if (session.tokens) {
        const cognitoUser = await getCurrentUser();
        const mappedUser = mapCognitoUser(cognitoUser);
        setUser(mappedUser);
      } else {
        // No valid session
        setUser(null);
      }
    } catch (error) {
      // No authenticated session - this is expected when not logged in
      console.log('No authenticated session found');
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
      const unsubscribe = Hub.listen('auth', ({ payload: { event } }) => {
        switch (event) {
          case 'signedIn':
          case 'signInWithRedirect':
            checkAuthState();
            break;
          case 'signedOut':
            setUser(null);
            break;
          case 'signInWithRedirect_failure':
            console.error('Authentication failed');
            setUser(null);
            break;
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
      if (urlParams.get('code')) {
        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        checkAuthState();
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
