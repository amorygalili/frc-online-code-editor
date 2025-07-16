// JSON Schema definitions for GitHub-hosted challenges

export interface GitHubChallengeRepository {
  version: string;
  repository: {
    name: string;
    description: string;
    author: string;
    license?: string;
    website?: string;
    contact?: string;
  };
  challenges: GitHubChallengeReference[];
}

export interface GitHubChallengeReference {
  id: string;
  path: string;
  enabled: boolean;
  version?: string;
}

export interface GitHubChallengeMetadata {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  version: string;
  prerequisites?: string[];
  tags: string[];
  files: {
    instructions: string; // Path to instructions.md file
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
  version: { type: 'string', required: true },
  repository: {
    type: 'object',
    required: true,
    properties: {
      name: { type: 'string', required: true },
      description: { type: 'string', required: true },
      author: { type: 'string', required: true },
      license: { type: 'string' },
      website: { type: 'string' },
      contact: { type: 'string' }
    }
  },
  challenges: {
    type: 'array',
    required: true,
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', required: true },
        path: { type: 'string', required: true },
        enabled: { type: 'boolean', required: true },
        version: { type: 'string' }
      }
    }
  }
};

export const GitHubChallengeMetadataSchema = {
  id: { type: 'string', required: true },
  title: { type: 'string', required: true },
  description: { type: 'string', required: true },
  difficulty: { 
    type: 'string', 
    required: true, 
    enum: ['Beginner', 'Intermediate', 'Advanced'] 
  },
  category: { type: 'string', required: true },
  estimatedTime: { type: 'string', required: true },
  version: { type: 'string', required: true },
  prerequisites: { type: 'array', items: { type: 'string' } },
  tags: { type: 'array', required: true, items: { type: 'string' } },
  files: {
    type: 'object',
    required: true,
    properties: {
      instructions: { type: 'string', required: true }
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
