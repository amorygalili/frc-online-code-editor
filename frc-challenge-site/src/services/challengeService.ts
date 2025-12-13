// Challenge Service - API layer for challenge data
// Connected to AWS Lambda functions

import { fetchAuthSession } from 'aws-amplify/auth';

// GitHub challenge metadata type (simplified for frontend)
interface GitHubChallengeMetadata {
  title: string;
  description: string;
  files: {
    instructions: string;
    simVisualization: string;
    robotCode: string;
  };
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://6gn6mwav0j.execute-api.us-east-2.amazonaws.com/dev';

/**
 * Simplified Challenge interface matching the new schema
 * Removed: difficulty, category, estimatedTime, version, prerequisites, tags
 * Core fields (title, description, files) are now only in metadata
 */
export interface Challenge {
  id: string;
  // Git repository fields (all challenges are now git-based)
  github: {
    url: string;
    branch: string;
    repositoryId: string;
    challengePath: string; // Path within the repository (e.g., "example-challenge")
  };
  // Metadata from the challenge (contains title, description, files)
  metadata: GitHubChallengeMetadata;
  // Standard fields
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeWithProgress extends Challenge {
  userProgress?: UserProgress;
}

export interface UserProgress {
  challengeId: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeSession {
  sessionId: string;
  userId: string;
  challengeId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  containerInfo?: {
    taskArn?: string;
    publicIp?: string;
    editorUrl?: string;
    nt4Url?: string;
    halWebSocketUrl?: string;
    // ALB-routed endpoints
    albEndpoints?: {
      main?: string;        // http://alb-dns/session/sessionId/
      vscode?: string;      // http://alb-dns/vscode/sessionId/
      health?: string;      // http://alb-dns/session/sessionId/
      nt4?: string;         // ws://alb-dns/session/sessionId/nt4
      halWebSocket?: string; // ws://alb-dns/session/sessionId/hal
    };
  };
  resourceProfile: 'development' | 'basic' | 'advanced' | 'competition';
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  expiresAt: string;
}

// GitHub Challenge Import Types
export interface ImportResult {
  repositoryId: string;
  status: 'success' | 'error';
  message: string;
  challengesFound: number;
  challenges: {
    id: string;
    title: string;
    status: 'imported' | 'error';
    error?: string;
  }[];
}

export interface ImportedRepository {
  id: string;
  githubUrl: string;
  branch: string;
  name: string;
  description: string;
  author: string;
  challengeCount: number;
  lastImport: string;
  importStatus: 'pending' | 'imported' | 'error';
}

export interface SyncResult {
  status: 'success' | 'error';
  message: string;
  updatedChallenges: string[];
  newChallenges: string[];
  removedChallenges: string[];
}

export interface SessionCreateRequest {
  challengeId: string;
  resourceProfile?: 'development' | 'basic' | 'advanced' | 'competition';
}



// Simplified filters - removed category, difficulty since they're not in the new schema
export interface ChallengeFilters {
  status?: string;
  search?: string;
}

// API Helper Functions
async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    if (session.tokens?.idToken) {
      return session.tokens.idToken.toString();
    }
    return null;
  } catch (error) {
    console.log('No authenticated user found');
    return null;
  }
}

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const jsonResponse = await response.json();

  // Extract data from the API response structure
  if (jsonResponse.success && jsonResponse.data !== undefined) {
    return jsonResponse.data;
  } else if (jsonResponse.success === false) {
    throw new Error(`API error: ${jsonResponse.error?.message || 'Unknown error'}`);
  }

  return jsonResponse;
}

// Mock user progress data for development (will be replaced with API calls)
const mockProgress: Record<string, UserProgress> = {
  '1': {
    challengeId: '1',
    userId: 'user123',
    status: 'completed',
    completedAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  '2': {
    challengeId: '2',
    userId: 'user123',
    status: 'in_progress',
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
};

class ChallengeService {
  // Get all challenges with user progress applied
  async getChallenges(filters?: ChallengeFilters): Promise<ChallengeWithProgress[]> {
    try {
      // Fetch challenges from API
      const response = await apiRequest('/challenges');
      const apiChallenges = response.challenges || [];

      // Cast API response to ChallengeWithProgress array
      let challenges: ChallengeWithProgress[] = apiChallenges;

      // Apply filters (simplified - removed category/difficulty filters)
      if (filters) {
        if (filters.status && filters.status !== 'all') {
          challenges = challenges.filter((c) => (c.userProgress?.status || 'not_started') === filters.status);
        }

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          challenges = challenges.filter((c) =>
            (c.metadata?.title || '').toLowerCase().includes(searchLower) ||
            (c.metadata?.description || '').toLowerCase().includes(searchLower)
          );
        }
      }

      return challenges;

    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      throw error;
    }
  }
  
  // Get a specific challenge by ID
  async getChallenge(id: string): Promise<ChallengeWithProgress | null> {
    try {
      const apiResponse = await apiRequest(`/challenges/${id}`);
      return apiResponse as ChallengeWithProgress;
    } catch (error) {
      console.error(`Failed to fetch challenge ${id}:`, error);
      return null;
    }
  }
  
  // Get user progress for a challenge
  async getChallengeProgress(challengeId: string): Promise<UserProgress | null> {
    try {
      const progress = await apiRequest(`/user/progress?challengeId=${challengeId}`);
      return progress;
    } catch (error) {
      console.error(`Failed to fetch progress for challenge ${challengeId}:`, error);
      // Return mock data as fallback
      return mockProgress[challengeId] || null;
    }
  }
  
  // Update user progress
  async updateChallengeProgress(challengeId: string, progress: Partial<UserProgress>): Promise<void> {
    try {
      await apiRequest(`/challenges/${challengeId}/progress`, {
        method: 'PUT',
        body: JSON.stringify(progress),
      });
    } catch (error) {
      console.error(`Failed to update progress for challenge ${challengeId}:`, error);
      // Update mock data as fallback
      if (mockProgress[challengeId]) {
        mockProgress[challengeId] = { ...mockProgress[challengeId], ...progress };
      } else {
        mockProgress[challengeId] = {
          challengeId,
          userId: 'user123', // This would come from auth context
          status: 'not_started',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...progress,
        };
      }
    }
  }

  // Create a challenge session (new session management API)
  async createSession(request: SessionCreateRequest): Promise<ChallengeSession> {
    try {
      const session = await apiRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return session;
    } catch (error) {
      console.error(`Failed to create session for challenge ${request.challengeId}:`, error);
      throw error;
    }
  }

  // Get session details
  async getSession(sessionId: string): Promise<ChallengeSession | null> {
    try {
      const session = await apiRequest(`/sessions/${sessionId}`);
      return session;
    } catch (error) {
      console.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  // List user sessions
  async listSessions(): Promise<ChallengeSession[]> {
    try {
      const response = await apiRequest('/sessions');
      return response.sessions || [];
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  // Terminate a session
  async terminateSession(sessionId: string): Promise<void> {
    try {
      await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  // Keep session alive
  async keepSessionAlive(sessionId: string): Promise<void> {
    try {
      await apiRequest(`/sessions/${sessionId}/keepalive`, {
        method: 'POST',
      });
    } catch (error) {
      console.error(`Failed to keep session ${sessionId} alive:`, error);
      throw error;
    }
  }

  // Import challenges from GitHub repository
  async importGitHubChallenges(githubUrl: string, branch?: string, accessToken?: string): Promise<ImportResult> {
    try {
      const response = await apiRequest('/challenges/import', {
        method: 'POST',
        body: JSON.stringify({
          githubUrl,
          branch: branch || 'main',
          accessToken
        }),
      });

      return response as ImportResult;
    } catch (error) {
      console.error('Failed to import GitHub challenges:', error);
      throw error;
    }
  }

  // Get imported repositories
  async getImportedRepositories(): Promise<ImportedRepository[]> {
    try {
      const response = await apiRequest('/challenges/repositories');
      return response.repositories || [];
    } catch (error) {
      console.error('Failed to get imported repositories:', error);
      throw error;
    }
  }

  // Sync repository with latest changes
  async syncRepository(repositoryId: string): Promise<SyncResult> {
    try {
      const response = await apiRequest(`/challenges/repositories/${repositoryId}/sync`, {
        method: 'POST',
      });

      return response as SyncResult;
    } catch (error) {
      console.error(`Failed to sync repository ${repositoryId}:`, error);
      throw error;
    }
  }

  // Remove imported repository
  async removeRepository(repositoryId: string): Promise<void> {
    try {
      await apiRequest(`/challenges/repositories/${repositoryId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Failed to remove repository ${repositoryId}:`, error);
      throw error;
    }
  }

  // Removed getCategories() and getDifficulties() - no longer part of simplified schema
}

// Export singleton instance
export const challengeService = new ChallengeService();
