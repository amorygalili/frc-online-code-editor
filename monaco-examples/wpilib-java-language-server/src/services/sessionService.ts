// Session Service - Manages challenge runtime sessions
// Handles container lifecycle and connection management

import { challengeService, ChallengeSession, SessionCreateRequest } from './challengeService';

export interface SessionConnectionInfo {
  sessionId: string;
  editorUrl: string;
  nt4Url: string;
  halWebSocketUrl: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
}

class SessionService {
  private activeSessions: Map<string, ChallengeSession> = new Map();
  private keepAliveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Create a new challenge session
  async createSession(challengeId: string, resourceProfile: 'development' | 'basic' | 'advanced' | 'competition' = 'basic'): Promise<ChallengeSession> {
    try {
      console.log(`Creating session for challenge ${challengeId} with profile ${resourceProfile}`);
      
      // Check if user already has an active session
      const existingSessions = await challengeService.listSessions();
      const activeSession = existingSessions.find(s => 
        s.status === 'running' || s.status === 'starting'
      );

      if (activeSession) {
        console.log('Found existing active session:', activeSession.sessionId);
        // Ask user if they want to terminate the existing session
        const shouldTerminate = confirm(
          `You have an active session for challenge "${activeSession.challengeId}". ` +
          'Would you like to terminate it and start a new session?'
        );
        
        if (shouldTerminate) {
          await this.terminateSession(activeSession.sessionId);
        } else {
          throw new Error('Cannot create new session while another is active');
        }
      }

      // Create new session
      const request: SessionCreateRequest = {
        challengeId,
        resourceProfile
      };

      const session = await challengeService.createSession(request);
      this.activeSessions.set(session.sessionId, session);

      // Start keep-alive for the session
      this.startKeepAlive(session.sessionId);

      // Poll for session readiness
      await this.waitForSessionReady(session.sessionId);

      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  // Wait for session to be ready
  private async waitForSessionReady(sessionId: string, maxWaitTime: number = 300000): Promise<ChallengeSession> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const session = await challengeService.getSession(sessionId);
          if (!session) {
            reject(new Error('Session not found'));
            return;
          }

          console.log(`Session ${sessionId} status: ${session.status}`);

          if (session.status === 'running' && session.containerInfo?.editorUrl) {
            this.activeSessions.set(sessionId, session);
            resolve(session);
            return;
          }

          if (session.status === 'failed') {
            reject(new Error('Session failed to start'));
            return;
          }

          // Check timeout
          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('Session startup timeout'));
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  // Get session connection info
  getSessionConnection(sessionId: string): SessionConnectionInfo | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.containerInfo) {
      return null;
    }

    const { containerInfo } = session;
    return {
      sessionId,
      editorUrl: containerInfo.editorUrl || '',
      nt4Url: containerInfo.nt4Url || '',
      halWebSocketUrl: containerInfo.halWebSocketUrl || '',
      status: session.status === 'running' ? 'connected' : 'connecting'
    };
  }

  // Terminate a session
  async terminateSession(sessionId: string): Promise<void> {
    try {
      console.log(`Terminating session ${sessionId}`);
      
      // Stop keep-alive
      this.stopKeepAlive(sessionId);
      
      // Remove from active sessions
      this.activeSessions.delete(sessionId);
      
      // Call API to terminate
      await challengeService.terminateSession(sessionId);
      
      console.log(`Session ${sessionId} terminated successfully`);
    } catch (error) {
      console.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  // Start keep-alive for a session
  private startKeepAlive(sessionId: string): void {
    // Clear any existing interval
    this.stopKeepAlive(sessionId);

    const interval = setInterval(async () => {
      try {
        await challengeService.keepSessionAlive(sessionId);
        console.log(`Keep-alive sent for session ${sessionId}`);
      } catch (error) {
        console.error(`Keep-alive failed for session ${sessionId}:`, error);
        // Stop keep-alive on failure
        this.stopKeepAlive(sessionId);
      }
    }, this.KEEP_ALIVE_INTERVAL);

    this.keepAliveIntervals.set(sessionId, interval);
  }

  // Stop keep-alive for a session
  private stopKeepAlive(sessionId: string): void {
    const interval = this.keepAliveIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(sessionId);
    }
  }

  // Get all active sessions
  getActiveSessions(): ChallengeSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Clean up all sessions (call on app unmount)
  cleanup(): void {
    console.log('Cleaning up session service');
    
    // Stop all keep-alive intervals
    for (const sessionId of this.keepAliveIntervals.keys()) {
      this.stopKeepAlive(sessionId);
    }
    
    // Clear active sessions
    this.activeSessions.clear();
  }
}

// Export singleton instance
export const sessionService = new SessionService();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sessionService.cleanup();
  });
}
