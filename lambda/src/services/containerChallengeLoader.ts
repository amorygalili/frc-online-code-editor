// Service for loading GitHub-hosted challenges into containers

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GitHubChallengeService } from './githubChallengeService';
import { Challenge } from '../types/challenge';
import { config } from '../config';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.region }));

export interface ContainerChallengeSetup {
  challengeData: Challenge;
  workspaceFiles: ContainerFile[];
}

export interface ContainerFile {
  path: string;
  content: string;
  executable?: boolean;
}

export class ContainerChallengeLoader {
  private githubService: GitHubChallengeService;

  constructor(accessToken?: string) {
    this.githubService = new GitHubChallengeService(accessToken);
  }

  /**
   * Prepare challenge setup for container loading
   */
  async prepareChallengeSetup(challengeId: string): Promise<ContainerChallengeSetup> {
    // Get challenge from unified challenges table
    const challenge = await this.getChallenge(challengeId);
    if (!challenge) {
      // List available challenges for debugging
      await this.listAvailableChallenges();
      throw new Error(`Challenge ${challengeId} not found`);
    }

    return this.prepareGitChallenge(challenge);
  }

  /**
   * List all available challenges for debugging
   */
  private async listAvailableChallenges(): Promise<void> {
    try {
      console.log('Listing all available challenges for debugging...');

      const command = new ScanCommand({
        TableName: config.tables.challenges,
        Limit: 10 // Just get first 10 for debugging
      });

      const result = await dynamoClient.send(command);
      console.log(`Found ${result.Items?.length || 0} challenges in database:`);

      if (result.Items) {
        result.Items.forEach((item, index) => {
          console.log(`${index + 1}. ID: ${item.id}, Title: ${item.title || 'No title'}`);
        });
      }
    } catch (error) {
      console.error('Error listing challenges:', error);
    }
  }

  /**
   * Get challenge from unified challenges table
   */
  private async getChallenge(challengeId: string): Promise<Challenge | null> {
    try {
      console.log(`Looking for challenge with ID: ${challengeId} in table: ${config.tables.challenges}`);

      const command = new GetCommand({
        TableName: config.tables.challenges,
        Key: { id: challengeId }
      });

      const result = await dynamoClient.send(command);
      console.log(`DynamoDB result for challenge ${challengeId}:`, JSON.stringify(result, null, 2));

      if (result.Item) {
        console.log(`Found challenge: ${result.Item.title}`);
        return result.Item as Challenge;
      }

      console.log(`Challenge ${challengeId} not found in database`);
      return null;
    } catch (error) {
      console.error('Error fetching challenge:', error);
      return null;
    }
  }

  /**
   * Prepare setup for git-based challenge
   */
  private async prepareGitChallenge(challenge: Challenge): Promise<ContainerChallengeSetup> {
    const { githubUrl, githubBranch } = challenge;

    // Parse the repository to get challenge files
    const parsedRepo = await this.githubService.parseRepository(githubUrl, githubBranch);
    const parsedChallenge = parsedRepo.challenges.find(c => c.metadata.id === challenge.metadata.id);

    if (!parsedChallenge) {
      throw new Error(`Challenge ${challenge.metadata.id} not found in repository`);
    }

    const workspaceFiles: ContainerFile[] = [];

    // Add robot code files - these will replace the entire src/main/java/frc/robot/ folder
    for (const file of parsedChallenge.files.robotCode) {
      // Map the robot code files to the correct paths in the container
      // Files from starter-code/robot/ go to src/main/java/frc/robot/
      const relativePath = file.path.replace(/.*\/starter-code\/robot\//, '');
      workspaceFiles.push({
        path: `src/main/java/frc/robot/${relativePath}`,
        content: file.content
      });
    }

    return {
      challengeData: challenge,
      workspaceFiles
    };
  }

  // Removed build configuration methods - we only modify robot Java source files

  /**
   * Generate container API payload for challenge setup
   */
  generateContainerSetupPayload(setup: ContainerChallengeSetup): any {
    return {
      challengeId: setup.challengeData.id,
      files: setup.workspaceFiles,
      metadata: setup.challengeData.metadata
    };
  }
}
