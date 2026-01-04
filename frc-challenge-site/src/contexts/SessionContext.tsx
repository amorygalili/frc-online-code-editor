import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { sessionService } from '../services/sessionService';
import { challengeService, ChallengeSession, Challenge } from '../services/challengeService';

// Session status for UI
export type SessionStatus = 'idle' | 'loading' | 'creating' | 'connecting' | 'ready' | 'failed';

// Types
export interface SessionContextType {
  // Current session state
  session: ChallengeSession | null;
  challenge: Challenge | null;
  isSessionActive: boolean;

  // Loading/status state
  status: SessionStatus;
  error: string | null;

  // Session lifecycle
  initializeSession: (challengeId: string, resourceProfile?: string) => Promise<void>;
  createSession: (challengeId: string, resourceProfile?: string) => Promise<ChallengeSession>;
  terminateSession: () => Promise<void>;

  // Session management
  keepAlive: () => Promise<void>;
  getSessionStatus: () => Promise<ChallengeSession | null>;

  // Helpers
  getServerUrl: () => string | null;
  clearError: () => void;
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
  challengeId?: string;  // If provided, auto-initialize session
  initialSession?: ChallengeSession;
  initialChallenge?: Challenge;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  challengeId: initialChallengeId,
  initialSession = null,
  initialChallenge = null
}) => {
  const [session, setSession] = useState<ChallengeSession | null>(initialSession);
  const [challenge, setChallenge] = useState<Challenge | null>(initialChallenge);
  const [status, setStatus] = useState<SessionStatus>(initialSession ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [keepAliveInterval, setKeepAliveInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const isSessionActive = session?.status === 'running';

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get server URL from session endpoints
  const getServerUrl = useCallback((): string | null => {
    if (!session) return null;

    const mainUrl = session.containerInfo?.albEndpoints?.main;
    if (!mainUrl) return null;

    try {
      const url = new URL(mainUrl);
      return url.hostname;
    } catch {
      return null;
    }
  }, [session]);

  // Keep-alive mechanism
  const keepAlive = useCallback(async () => {
    if (!session) return;

    try {
      await sessionService.keepSessionAlive(session.sessionId);
      console.log(`Keep-alive sent for session ${session.sessionId}`);
    } catch (err) {
      console.error('Failed to send keep-alive:', err);
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

  // Initialize session - loads challenge and creates/reuses session
  const initializeSession = useCallback(async (challengeId: string, resourceProfile = 'basic') => {
    try {
      setStatus('loading');
      setError(null);

      // Load challenge details
      console.log(`Loading challenge ${challengeId}`);
      const challengeData = await challengeService.getChallenge(challengeId);
      if (!challengeData) {
        throw new Error('Challenge not found');
      }
      setChallenge(challengeData);

      // Check for existing active session
      console.log('Checking for existing active session...');
      const activeSession = await sessionService.getCurrentActiveSession();

      if (activeSession && activeSession.status === 'running') {
        console.log('Found existing active session:', activeSession.sessionId);
        setSession({ ...activeSession, challengeId });
        setStatus('ready');
        return;
      }

      // Create new session
      setStatus('creating');
      console.log(`Creating session for challenge ${challengeId}`);
      const sessionData = await sessionService.createSession(challengeId, resourceProfile as 'basic' | 'development' | 'advanced' | 'competition');
      console.log('Session data received:', sessionData);
      setSession(sessionData);

      if (sessionData.status === 'running') {
        setStatus('ready');
      } else {
        setStatus('connecting');
        // sessionService.createSession already waits for readiness
        setStatus('ready');
      }
    } catch (err) {
      console.error('Failed to initialize session:', err);
      let errorMessage = 'Failed to start challenge session';

      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Session startup timed out. The container may be taking longer than expected to start.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setStatus('failed');
    }
  }, []);

  // Create a new session (without loading challenge)
  const createSession = useCallback(async (challengeId: string, resourceProfile = 'basic') => {
    try {
      setStatus('creating');
      console.log(`Creating session for challenge ${challengeId}`);
      const newSession = await sessionService.createSession(challengeId, resourceProfile as 'basic' | 'development' | 'advanced' | 'competition');
      setSession(newSession);
      setStatus(newSession.status === 'running' ? 'ready' : 'connecting');
      return newSession;
    } catch (err) {
      console.error('Failed to create session:', err);
      setStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
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
      setStatus('idle');

      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        setKeepAliveInterval(null);
      }
    } catch (err) {
      console.error('Failed to terminate session:', err);
      throw err;
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
    } catch (err) {
      console.error('Failed to get session status:', err);
      return null;
    }
  }, [session]);

  // Auto-initialize if challengeId is provided
  useEffect(() => {
    if (initialChallengeId && status === 'idle') {
      initializeSession(initialChallengeId);
    }
  }, [initialChallengeId, status, initializeSession]);

  // Update challenge when initialChallenge changes
  useEffect(() => {
    if (initialChallenge && !challenge) {
      setChallenge(initialChallenge);
    }
  }, [initialChallenge, challenge]);

  const contextValue: SessionContextType = {
    session,
    challenge,
    isSessionActive,
    status,
    error,
    initializeSession,
    createSession,
    terminateSession,
    keepAlive,
    getSessionStatus,
    getServerUrl,
    clearError,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};
