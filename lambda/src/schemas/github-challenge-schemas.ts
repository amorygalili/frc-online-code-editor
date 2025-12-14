// JSON Schema definitions for GitHub-hosted challenges

/**
 * Root challenges.json file structure
 * Simplified to just name, description, author, and array of challenge folder names
 */
export interface GitHubChallengeRepository {
  name: string;
  description: string;
  author: string;
  challenges: string[]; // Array of challenge folder names (e.g., ["example-challenge"])
}

/**
 * Per-challenge metadata.json file structure
 * Simplified to just title, description, and files configuration
 */
export interface GitHubChallengeMetadata {
  title: string;
  description: string;
  files: {
    instructions: string;     // Path to instructions file (e.g., "instructions.md")
    simVisualization: string; // Path to simulation visualization dist folder
    robotCode: string;        // Path to robot code source folder
    // Actual content fetched during import
    instructionsContent?: string;
  };
}

// Removed TestSuite interface as we're not using tests for now

// Removed ChallengeExtension interface - keeping it simple

// Removed separate database entities - now using unified Challenge interface from types/challenge.ts

export interface SyncRepositoryRequest {
  repositoryId: string;
  force?: boolean;
}

export interface SyncRepositoryResponse {
  status: 'success' | 'error';
  message: string;
  updatedChallenges: string[];
  newChallenges: string[];
  removedChallenges: string[];
}

// Validation schemas using Joi or similar
export const GitHubChallengeRepositorySchema = {
  name: { type: 'string', required: true },
  description: { type: 'string', required: true },
  author: { type: 'string', required: true },
  challenges: {
    type: 'array',
    required: true,
    items: { type: 'string' }
  }
};

export const GitHubChallengeMetadataSchema = {
  title: { type: 'string', required: true },
  description: { type: 'string', required: true },
  files: {
    type: 'object',
    required: true,
    properties: {
      instructions: { type: 'string', required: true },
      simVisualization: { type: 'string', required: true },
      robotCode: { type: 'string', required: true }
    }
  }
};

// Utility functions for validation
export function validateRepositoryMetadata(data: any): GitHubChallengeRepository {
  // Implementation would use a validation library like Joi or Zod
  // For now, return typed data assuming validation passes
  return data as GitHubChallengeRepository;
}

export function validateChallengeMetadata(data: any): GitHubChallengeMetadata {
  // Implementation would use a validation library like Joi or Zod
  // For now, return typed data assuming validation passes
  return data as GitHubChallengeMetadata;
}

// Helper functions for GitHub URL parsing
export function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  const patterns = [
    /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
    /^git@github\.com:([^\/]+)\/([^\/]+)\.git$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        branch: match[3] || 'main'
      };
    }
  }

  return null;
}

export function buildGitHubApiUrl(owner: string, repo: string, path: string, branch: string = 'main'): string {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
}

export function buildRawGitHubUrl(owner: string, repo: string, path: string, branch: string = 'main'): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}
