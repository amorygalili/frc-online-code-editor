// Shared Challenge types for the unified git-based system

import { GitHubChallengeMetadata } from '../schemas/github-challenge-schemas';

/**
 * Unified Challenge interface for all git-based challenges
 */
export interface Challenge {
  id: string;
  createdAt: string;
  updatedAt: string;
  // Git repository fields (all challenges are now git-based)
  github: {
    url: string;
    branch: string;
    repositoryId: string;
    challengePath: string; // Path within the repository (e.g., "example-challenge")
  };
  // Metadata from the challenge's metadata.json file
  // Contains: title, description, files { instructions, simVisualization, robotCode }
  metadata: GitHubChallengeMetadata;
}

/**
 * Challenge data for frontend consumption
 */
export interface ChallengeWithProgress extends Challenge {
  userProgress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: string;
  };
}

/**
 * Challenge filters for querying
 * Simplified - removed difficulty, category, tags filters since they're not in the new schema
 */
export interface ChallengeFilters {
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
