// Shared Challenge types for the unified git-based system

import { GitHubChallengeMetadata } from '../schemas/github-challenge-schemas';

/**
 * Unified Challenge interface for all git-based challenges
 * All challenges are now stored in the single ChallengesTable with git repository information
 */
export interface Challenge {
  // Core challenge information
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  version: string;
  prerequisites: string[];
  tags: string[];
  
  // Git repository fields (all challenges are now git-based)
  githubUrl: string;
  githubBranch: string;
  repositoryId: string;
  challengePath: string; // Path within the repository (e.g., "challenges/hello-world")
  
  // Metadata from the challenge's metadata.json file
  metadata: GitHubChallengeMetadata;
  
  // Sync information
  lastSynced: string;
  syncStatus: 'pending' | 'synced' | 'error';
  
  // Standard fields
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Challenge data for frontend consumption
 * Simplified version without internal sync fields
 */
export interface ChallengeWithProgress extends Omit<Challenge, 'lastSynced' | 'syncStatus'> {
  progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: string;
    timeSpent?: number;
  };
}

/**
 * Challenge filters for querying
 */
export interface ChallengeFilters {
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tags?: string[];
  search?: string;
}

/**
 * Challenge import request
 */
export interface ImportChallengeRepositoryRequest {
  githubUrl: string;
  branch?: string;
  accessToken?: string; // For private repositories
}

/**
 * Challenge import response
 */
export interface ImportChallengeRepositoryResponse {
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
