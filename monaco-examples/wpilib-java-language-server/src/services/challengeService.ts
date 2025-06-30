// Challenge Service - API layer for challenge data
// Connected to AWS Lambda functions

import { fetchAuthSession } from 'aws-amplify/auth';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://20uazzdjqb.execute-api.us-east-2.amazonaws.com/dev';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  prerequisites?: string[];
  learningObjectives: string[];
  instructions: string;
  hints?: string[];
  starterCode?: string;
  solutionCode?: string;
  testCases?: any[];
  tags: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeWithProgress extends Challenge {
  userProgress?: UserProgress;
  // Computed properties for UI compatibility
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  progress: number;
}

export interface UserProgress {
  challengeId: string;
  userId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  lastCode?: string;
  completedAt?: string;
  timeSpent: number; // in minutes
  bestScore?: number;
  createdAt: string;
  updatedAt: string;
}



export interface ChallengeFilters {
  category?: string;
  difficulty?: string;
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

  return response.json();
}

// Mock user progress data for development (will be replaced with API calls)
const mockProgress: Record<string, UserProgress> = {
  '1': {
    challengeId: '1',
    userId: 'user123',
    status: 'completed',
    progress: 100,
    completedAt: '2024-01-15T10:30:00Z',
    timeSpent: 20,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  '2': {
    challengeId: '2',
    userId: 'user123',
    status: 'in_progress',
    progress: 60,
    lastCode: 'partial implementation...',
    timeSpent: 15,
    createdAt: '2024-01-15T09:30:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
};

class ChallengeService {
  // Get all challenges with user progress applied
  async getChallenges(filters?: ChallengeFilters): Promise<ChallengeWithProgress[]> {
    try {
      // Fetch challenges from API
      const challenges: Challenge[] = await apiRequest('/challenges');
      
      // Apply user progress to challenges (this will be replaced with API call)
      const challengesWithProgress = challenges.map(challenge => {
        const progress = mockProgress[challenge.id];
        if (progress) {
          return {
            ...challenge,
            status: progress.status,
            progress: progress.progress,
          };
        }
        
        // Check if challenge should be unlocked based on prerequisites
        if (challenge.prerequisites && challenge.prerequisites.length > 0) {
          const prerequisitesMet = challenge.prerequisites.every(prereqId => {
            const prereqProgress = mockProgress[prereqId];
            return prereqProgress && prereqProgress.status === 'completed';
          });
          
          return {
            ...challenge,
            status: prerequisitesMet ? 'not_started' : 'locked',
            progress: 0,
          } as ChallengeWithProgress;
        }
        
        return {
          ...challenge,
          status: 'not_started' as const,
          progress: 0,
        };
      });
      
      // Apply filters
      let filteredChallenges = challengesWithProgress;
      
      if (filters) {
        if (filters.category && filters.category !== 'all') {
          filteredChallenges = filteredChallenges.filter(c => 
            c.category.toLowerCase() === filters.category!.toLowerCase()
          );
        }
        
        if (filters.difficulty && filters.difficulty !== 'all') {
          filteredChallenges = filteredChallenges.filter(c => 
            c.difficulty.toLowerCase() === filters.difficulty!.toLowerCase()
          );
        }
        
        if (filters.status && filters.status !== 'all') {
          filteredChallenges = filteredChallenges.filter(c => c.status === filters.status);
        }
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredChallenges = filteredChallenges.filter(c => 
            c.title.toLowerCase().includes(searchLower) ||
            c.description.toLowerCase().includes(searchLower) ||
            c.tags.some(tag => tag.toLowerCase().includes(searchLower))
          );
        }
      }
      
      // Sort by sortOrder
      return filteredChallenges.sort((a, b) => a.sortOrder - b.sortOrder);
      
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      throw error;
    }
  }
  
  // Get a specific challenge by ID
  async getChallenge(id: string): Promise<ChallengeWithProgress | null> {
    try {
      const challenge: Challenge = await apiRequest(`/challenges/${id}`);

      // Apply user progress (this will be replaced with API call)
      const progress = mockProgress[id];
      if (progress) {
        return {
          ...challenge,
          status: progress.status,
          progress: progress.progress,
        } as ChallengeWithProgress;
      }

      return {
        ...challenge,
        status: 'not_started' as const,
        progress: 0,
      } as ChallengeWithProgress;
      
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
          progress: 0,
          timeSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...progress,
        };
      }
    }
  }

  // Create a challenge session
  async createChallengeSession(challengeId: string): Promise<{ sessionId: string }> {
    try {
      const session = await apiRequest(`/challenges/${challengeId}/sessions`, {
        method: 'POST',
      });
      return session;
    } catch (error) {
      console.error(`Failed to create session for challenge ${challengeId}:`, error);
      throw error;
    }
  }

  // Save challenge code
  async saveChallengeCode(sessionId: string, code: string): Promise<void> {
    try {
      await apiRequest(`/sessions/${sessionId}/code`, {
        method: 'PUT',
        body: JSON.stringify({ code }),
      });
    } catch (error) {
      console.error(`Failed to save code for session ${sessionId}:`, error);
      throw error;
    }
  }

  // Get available categories
  getCategories(): string[] {
    return ['All', 'Basics', 'Sensors', 'Autonomous', 'Advanced'];
  }

  // Get available difficulty levels
  getDifficulties(): string[] {
    return ['All', 'Beginner', 'Intermediate', 'Advanced'];
  }
}

// Export singleton instance
export const challengeService = new ChallengeService();
