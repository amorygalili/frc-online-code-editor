import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

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
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);



// Provider component
interface AuthProviderProps {
  children: ReactNode;
}


// Convert Cognito user to our User type
const getCognitoUser = async (): Promise<User | null> => {
  
  try {
    // Get user attributes which contain the actual user info from Google
    const session = await fetchAuthSession();
    console.log("session:", session);
    const cognitoUser = await getCurrentUser();
    console.log("cognitoUser:", cognitoUser);
    const payload = session.tokens?.idToken?.payload;

    if (!payload) {
      return null;
    }

    // Extract user info from ID token payload
    return {
      id: cognitoUser.userId || cognitoUser.username || '',
      email: payload.email as string || '',
      name: payload.name as string || payload.given_name as string || payload.email as string || 'User',
      avatar: payload.picture as string || ''
    };

  } catch (error) {
    console.error('Error mapping user:', error);
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check current authentication status
  const checkAuthState = async () => {
    setIsLoading(true);
    const user = await getCognitoUser();
    setUser(user);
    setIsLoading(false);
  }

  // Sign in function
  const handleSignIn = async () => {
    try {
      // Use Cognito Hosted UI for Google OAuth
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign out function
  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Listen for authentication events
  useEffect(() => {
    // Only check auth state on mount
    checkAuthState();
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
          console.error('Failure details:', {
            error: payload.data?.error,
            errorDescription: (payload.data as any)?.error_description,
            message: (payload.data as any)?.message,
            fullPayload: payload
          });
          setUser(null);
          break;
        default:
          console.log('Unhandled auth event:', event, payload);
      }
    });

    return unsubscribe;
    
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    // Check if we're returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('code')) {

      // Give Amplify time to process the callback before checking auth state
      setTimeout(async () => {
        await checkAuthState();
        // Clear the URL parameters after processing
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    } else if (urlParams.get('error')) {
      console.error('OAuth callback error:', urlParams.get('error'), urlParams.get('error_description'));
    }
    
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signOut: handleSignOut,
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
