// Service for loading GitHub-hosted challenges into containers

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GitHubChallengeService } from './githubChallengeService';
import { Challenge } from '../types/challenge';
import { config } from '../config';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient(
  config.localStack.enabled
    ? { region: config.region, endpoint: config.localStack.endpoint }
    : { region: config.region }
));

export interface ContainerChallengeSetup {
  challengeData: Challenge;
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
   * Container will clone the repo and copy files, so we just return the challenge data
   */
  private async prepareGitChallenge(challenge: Challenge): Promise<ContainerChallengeSetup> {
    // Verify the challenge exists in the repository
    const { url: githubUrl, branch: githubBranch, challengePath } = challenge.github;

    const parsedRepo = await this.githubService.parseRepository(githubUrl, githubBranch);
    const parsedChallenge = parsedRepo.challenges.find(c => c.challengePath === challengePath);

    if (!parsedChallenge) {
      throw new Error(`Challenge ${challenge.id} not found in repository`);
    }

    return {
      challengeData: challenge
    };
  }

  /**
   * Generate container API payload for challenge setup
   * Container will clone the repo and get files directly
   */
  generateContainerSetupPayload(setup: ContainerChallengeSetup): any {
    const { github, metadata } = setup.challengeData;

    return {
      challengeId: setup.challengeData.id,
      metadata: metadata,
      // GitHub info for container to clone repo, copy robot code, and serve sim-visualization
      github: {
        url: github.url,
        branch: github.branch,
        challengePath: github.challengePath,
        simVisualizationPath: metadata.files.simVisualization,
        robotCodePath: metadata.files.robotCode
      }
    };
  }
}
