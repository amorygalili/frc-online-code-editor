// GitHub Challenge Service - Handles fetching and parsing challenges from GitHub repositories

import { 
  GitHubChallengeRepository, 
  GitHubChallengeMetadata,
  parseGitHubUrl,
  buildRawGitHubUrl,
  validateRepositoryMetadata,
  validateChallengeMetadata
} from '../schemas/github-challenge-schemas';

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  sha: string;
}

export interface ParsedRepository {
  metadata: GitHubChallengeRepository;
  challenges: ParsedChallenge[];
  errors: string[];
}

export interface ParsedChallenge {
  metadata: GitHubChallengeMetadata;
  files: {
    robotCode: GitHubFile[];
    instructions?: GitHubFile;
  };
  errors: string[];
}

export class GitHubChallengeService {
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  /**
   * Parse a GitHub repository and extract all challenges
   */
  async parseRepository(githubUrl: string, branch: string = 'main'): Promise<ParsedRepository> {
    const urlInfo = parseGitHubUrl(githubUrl);
    if (!urlInfo) {
      throw new Error('Invalid GitHub URL format');
    }

    const { owner, repo } = urlInfo;
    const actualBranch = urlInfo.branch || branch;

    try {
      // Fetch root challenges.json
      const rootMetadata = await this.fetchRepositoryMetadata(owner, repo, actualBranch);
      
      // Parse individual challenges
      const challenges: ParsedChallenge[] = [];
      const errors: string[] = [];

      for (const challengeRef of rootMetadata.challenges) {
        if (!challengeRef.enabled) {
          continue;
        }

        try {
          const challenge = await this.parseChallenge(owner, repo, actualBranch, challengeRef.path);
          challenges.push(challenge);
        } catch (error) {
          const errorMsg = `Failed to parse challenge ${challengeRef.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return {
        metadata: rootMetadata,
        challenges,
        errors
      };

    } catch (error) {
      throw new Error(`Failed to parse repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch and validate repository metadata from challenges.json
   */
  private async fetchRepositoryMetadata(owner: string, repo: string, branch: string): Promise<GitHubChallengeRepository> {
    const metadataUrl = buildRawGitHubUrl(owner, repo, 'challenges.json', branch);
    
    try {
      const response = await this.fetchWithAuth(metadataUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch challenges.json: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.text();
      const jsonData = JSON.parse(rawData);
      
      return validateRepositoryMetadata(jsonData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON in challenges.json');
      }
      throw error;
    }
  }

  /**
   * Parse an individual challenge from its directory
   */
  private async parseChallenge(owner: string, repo: string, branch: string, challengePath: string): Promise<ParsedChallenge> {
    // Fetch challenge metadata
    const metadataUrl = buildRawGitHubUrl(owner, repo, `${challengePath}/metadata.json`, branch);
    const metadataResponse = await this.fetchWithAuth(metadataUrl);
    
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata.json: ${metadataResponse.status}`);
    }

    const metadataRaw = await metadataResponse.text();
    const metadata = validateChallengeMetadata(JSON.parse(metadataRaw));

    // Fetch challenge files
    const files = await this.fetchChallengeFiles(owner, repo, branch, challengePath, metadata);

    return {
      metadata,
      files,
      errors: []
    };
  }

  /**
   * Fetch all files for a challenge based on its metadata
   */
  private async fetchChallengeFiles(
    owner: string,
    repo: string,
    branch: string,
    challengePath: string,
    metadata: GitHubChallengeMetadata
  ) {
    const files: ParsedChallenge['files'] = {
      robotCode: []
    };

    // Fetch robot code files from starter-code/robot/
    const robotCodePath = `${challengePath}/starter-code/robot`;
    try {
      files.robotCode = await this.fetchDirectoryFiles(
        owner, repo, branch, robotCodePath
      );
    } catch (error) {
      console.error(`Robot code files not found for challenge ${metadata.id} at ${robotCodePath}`);
      throw new Error(`Required robot code files not found at ${robotCodePath}`);
    }

    // Fetch instructions (optional)
    try {
      const instructionsUrl = buildRawGitHubUrl(
        owner, repo, `${challengePath}/instructions.md`, branch
      );
      const response = await this.fetchWithAuth(instructionsUrl);
      if (response.ok) {
        files.instructions = {
          name: 'instructions.md',
          path: `${challengePath}/instructions.md`,
          content: await response.text(),
          sha: '' // We don't need SHA for raw content
        };
      }
    } catch (error) {
      console.warn(`Instructions not found for challenge ${metadata.id}`);
    }

    return files;
  }

  /**
   * Fetch all files in a directory recursively
   */
  private async fetchDirectoryFiles(owner: string, repo: string, branch: string, path: string): Promise<GitHubFile[]> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const response = await this.fetchWithAuth(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch directory ${path}: ${response.status}`);
    }

    const items = await response.json() as {
      name: string;
      path: string;
      type: 'file' | 'dir';
      download_url?: string;
      sha: string;
    }[];
    const files: GitHubFile[] = [];

    for (const item of items) {
      if (item.type === 'file' && item.download_url) {
        // Fetch file content
        const contentResponse = await this.fetchWithAuth(item.download_url);
        if (contentResponse.ok) {
          files.push({
            name: item.name,
            path: item.path,
            content: await contentResponse.text(),
            sha: item.sha
          });
        }
      } else if (item.type === 'dir') {
        // Recursively fetch subdirectory files
        const subFiles = await this.fetchDirectoryFiles(owner, repo, branch, item.path);
        files.push(...subFiles);
      }
    }

    return files;
  }

  /**
   * Fetch with optional authentication
   */
  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'FRC-Challenge-Platform/1.0'
    };

    if (this.accessToken) {
      headers['Authorization'] = `token ${this.accessToken}`;
    }

    return fetch(url, { headers });
  }

  /**
   * Validate repository structure before parsing
   */
  async validateRepository(githubUrl: string, branch: string = 'main'): Promise<{ valid: boolean; errors: string[] }> {
    const urlInfo = parseGitHubUrl(githubUrl);
    if (!urlInfo) {
      return { valid: false, errors: ['Invalid GitHub URL format'] };
    }

    const { owner, repo } = urlInfo;
    const actualBranch = urlInfo.branch || branch;
    const errors: string[] = [];

    try {
      // Check if challenges.json exists
      const metadataUrl = buildRawGitHubUrl(owner, repo, 'challenges.json', actualBranch);
      const response = await this.fetchWithAuth(metadataUrl);
      
      if (!response.ok) {
        errors.push('challenges.json not found in repository root');
        return { valid: false, errors };
      }

      // Try to parse the metadata
      const rawData = await response.text();
      try {
        const jsonData = JSON.parse(rawData);
        validateRepositoryMetadata(jsonData);
      } catch (error) {
        errors.push(`Invalid challenges.json format: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return { valid: false, errors };
      }

      return { valid: true, errors: [] };

    } catch (error) {
      errors.push(`Repository validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, errors };
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(githubUrl: string): Promise<{ name: string; description: string; defaultBranch: string }> {
    const urlInfo = parseGitHubUrl(githubUrl);
    if (!urlInfo) {
      throw new Error('Invalid GitHub URL format');
    }

    const { owner, repo } = urlInfo;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    const response = await this.fetchWithAuth(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch repository info: ${response.status}`);
    }

    const repoData = await response.json() as {
      full_name: string;
      description?: string;
      default_branch?: string;
    };
    return {
      name: repoData.full_name,
      description: repoData.description || '',
      defaultBranch: repoData.default_branch || 'main'
    };
  }
}
