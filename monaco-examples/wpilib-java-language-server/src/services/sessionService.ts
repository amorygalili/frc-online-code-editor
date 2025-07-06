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
  private keepAliveIntervals: Map<string, number> = new Map();
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
        console.log('Reusing existing session for challenge:', challengeId);

        // Always reuse the existing session regardless of challenge
        // The same container can handle multiple challenges
        this.activeSessions.set(activeSession.sessionId, activeSession);

        // Start keep-alive for the reused session
        this.startKeepAlive(activeSession.sessionId);

        // Wait for session to be ready if it's still starting
        if (activeSession.status === 'starting') {
          await this.waitForSessionReady(activeSession.sessionId);
        }

        // Update the session's current challenge ID (for tracking purposes)
        // Note: This is just for local tracking, the container remains the same
        const updatedSession = { ...activeSession, challengeId };
        this.activeSessions.set(activeSession.sessionId, updatedSession);

        return updatedSession;
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
  private async waitForSessionReady(sessionId: string, maxWaitTime: number = 600000): Promise<ChallengeSession> {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds for more responsive polling

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const session = await challengeService.getSession(sessionId);
          if (!session) {
            reject(new Error('Session not found'));
            return;
          }

          console.log(`Session ${sessionId} status: ${session.status}`, session.containerInfo);

          // Consider session ready if it's running, even without full container info
          // The container info might be populated later
          if (session.status === 'running') {
            this.activeSessions.set(sessionId, session);
            resolve(session);
            return;
          }

          if (session.status === 'failed') {
            reject(new Error(`Session failed to start: ${session.sessionId}`));
            return;
          }

          if (session.status === 'stopped') {
            reject(new Error(`Session was stopped: ${session.sessionId}`));
            return;
          }

          // Check timeout
          if (Date.now() - startTime > maxWaitTime) {
            const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
            reject(new Error(`Session startup timeout after ${elapsedMinutes} minutes. The container may be taking longer than expected to start.`));
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

  // Get session details
  async getSession(sessionId: string): Promise<ChallengeSession | null> {
    try {
      const session = await challengeService.getSession(sessionId);
      if (session) {
        this.activeSessions.set(sessionId, session);
      }
      return session;
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  // List user sessions
  async listSessions(): Promise<ChallengeSession[]> {
    try {
      return await challengeService.listSessions();
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  // Keep session alive
  async keepSessionAlive(sessionId: string): Promise<void> {
    try {
      await challengeService.keepSessionAlive(sessionId);
      console.log(`Keep-alive sent for session ${sessionId}`);
    } catch (error) {
      console.error(`Failed to send keep-alive for session ${sessionId}:`, error);
      throw error;
    }
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
