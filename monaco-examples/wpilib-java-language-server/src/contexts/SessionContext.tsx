import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { sessionService } from '../services/sessionService';
import { ChallengeSession, Challenge } from '../services/challengeService';

// Types
export interface SessionContextType {
  // Current session state
  session: ChallengeSession | null;
  challenge: Challenge | null;
  isSessionActive: boolean;
  
  // Session lifecycle
  createSession: (challengeId: string, resourceProfile?: string) => Promise<ChallengeSession>;
  terminateSession: () => Promise<void>;
  
  // Session management
  keepAlive: () => Promise<void>;
  getSessionStatus: () => Promise<ChallengeSession | null>;
}

// Create context
const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Custom hook to use the context
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

// Provider component
interface SessionProviderProps {
  children: ReactNode;
  initialSession?: ChallengeSession;
  initialChallenge?: Challenge;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ 
  children, 
  initialSession = null,
  initialChallenge = null 
}) => {
  const [session, setSession] = useState<ChallengeSession | null>(initialSession);
  const [challenge, setChallenge] = useState<Challenge | null>(initialChallenge);
  const [keepAliveInterval, setKeepAliveInterval] = useState<number | null>(null);

  const isSessionActive = session?.status === 'running';

  // Keep-alive mechanism
  const keepAlive = useCallback(async () => {
    if (!session) return;
    
    try {
      await sessionService.keepSessionAlive(session.sessionId);
      console.log(`Keep-alive sent for session ${session.sessionId}`);
    } catch (error) {
      console.error('Failed to send keep-alive:', error);
    }
  }, [session]);

  // Start keep-alive interval when session becomes active
  useEffect(() => {
    if (isSessionActive && !keepAliveInterval) {
      console.log('Starting keep-alive interval for session', session?.sessionId);
      const interval = setInterval(keepAlive, 5 * 60 * 1000); // 5 minutes
      setKeepAliveInterval(interval);
    } else if (!isSessionActive && keepAliveInterval) {
      console.log('Stopping keep-alive interval');
      clearInterval(keepAliveInterval);
      setKeepAliveInterval(null);
    }

    return () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
    };
  }, [isSessionActive, keepAlive, keepAliveInterval, session?.sessionId]);

  // Create a new session
  const createSession = useCallback(async (challengeId: string, resourceProfile = 'basic') => {
    try {
      console.log(`Creating session for challenge ${challengeId}`);
      const newSession = await sessionService.createSession(challengeId, resourceProfile as any);
      setSession(newSession);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, []);

  // Terminate the current session
  const terminateSession = useCallback(async () => {
    if (!session) return;

    try {
      console.log(`Terminating session ${session.sessionId}`);
      await sessionService.terminateSession(session.sessionId);
      setSession(null);
      setChallenge(null);
      
      // Clear keep-alive interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        setKeepAliveInterval(null);
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
      throw error;
    }
  }, [session, keepAliveInterval]);

  // Get current session status
  const getSessionStatus = useCallback(async () => {
    if (!session) return null;

    try {
      const updatedSession = await sessionService.getSession(session.sessionId);
      if (updatedSession) {
        setSession(updatedSession);
      }
      return updatedSession;
    } catch (error) {
      console.error('Failed to get session status:', error);
      return null;
    }
  }, [session]);

  // Update challenge when session changes
  useEffect(() => {
    if (initialChallenge && !challenge) {
      setChallenge(initialChallenge);
    }
  }, [initialChallenge, challenge]);

  const contextValue: SessionContextType = {
    session,
    challenge,
    isSessionActive,
    createSession,
    terminateSession,
    keepAlive,
    getSessionStatus,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};
