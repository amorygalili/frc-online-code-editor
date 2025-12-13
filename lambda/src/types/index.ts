// Shared types for the FRC Challenge Platform Lambda functions
// Re-export Challenge types from the simplified schema
export { Challenge, ChallengeWithProgress, ChallengeFilters } from './challenge';

export interface UserProgress {
  userId: string;
  challengeId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

// Import for type usage
import { ChallengeWithProgress } from './challenge';

export interface GetChallengesResponse {
  challenges: ChallengeWithProgress[];
  total: number;
  hasMore: boolean;
}

export interface UpdateProgressRequest {
  status?: 'not_started' | 'in_progress' | 'completed';
}

export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  details?: any;
}
