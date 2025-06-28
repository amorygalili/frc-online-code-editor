import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
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

// Mock user for development when AWS is not configured
const mockUser: User = {
  id: 'mock-user-123',
  email: 'demo@example.com',
  name: 'Demo User',
  avatar: '',
};

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
  const checkAuthState = async () => {
    if (!configured) {
      // Use mock authentication for development
      console.log('Using mock authentication - AWS Cognito not configured');
      setUser(mockUser);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cognitoUser = await getCurrentUser();
      const mappedUser = mapCognitoUser(cognitoUser);
      setUser(mappedUser);
    } catch (error) {
      // User is not authenticated or Cognito not properly configured
      console.log('User not authenticated or Cognito configuration issue:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in function
  const signIn = async () => {
    if (!configured) {
      // Mock sign in
      setUser(mockUser);
      return;
    }

    try {
      // Use Cognito Hosted UI for Google OAuth
      await signIn({ provider: 'Google' });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign out function
  const signOut = async () => {
    if (!configured) {
      // Mock sign out
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
  };

  // Listen for authentication events
  useEffect(() => {
    checkAuthState();

    if (configured) {
      // Listen for auth state changes
      const unsubscribe = Hub.listen('auth', ({ payload: { event, data } }) => {
        switch (event) {
          case 'signedIn':
          case 'cognitoHostedUI':
            checkAuthState();
            break;
          case 'signedOut':
            setUser(null);
            break;
          case 'signIn_failure':
          case 'cognitoHostedUI_failure':
            console.error('Authentication failed:', data);
            setUser(null);
            break;
        }
      });

      return unsubscribe;
    }
  }, [configured]);

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
  }, [configured]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
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
