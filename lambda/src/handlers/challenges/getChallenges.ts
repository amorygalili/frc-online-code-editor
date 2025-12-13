// Get Challenges Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Challenge, ChallengeWithProgress, ChallengeFilters } from '../../types/challenge';
import { UserProgress, GetChallengesResponse } from '../../types';
import { successResponse, errorResponse, internalErrorResponse, getUserIdFromEvent } from '../../utils/response';
import { scanItems, queryItems, TABLES } from '../../utils/dynamodb';

// Simplified request interface matching new schema
interface GetChallengesRequest extends ChallengeFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('getChallenges event:', JSON.stringify(event, null, 2));

    // Extract user ID from Cognito claims
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return errorResponse({
        statusCode: 401,
        message: 'User not authenticated',
        code: 'UNAUTHORIZED',
      }, event);
    }

    // Parse query parameters - simplified (removed category, difficulty)
    const queryParams = event.queryStringParameters || {};
    const request: GetChallengesRequest = {
      status: queryParams.status,
      search: queryParams.search,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
    };

    console.log('Request parameters:', request);

    // Get challenges from DynamoDB
    const challenges = await getChallenges(request);
    
    // Get user progress for all challenges
    const userProgress = await getUserProgress(userId);
    
    // Combine challenges with user progress
    const challengesWithProgress = combineWithProgress(challenges, userProgress);
    
    // Apply status filtering if requested
    const filteredChallenges = applyStatusFilter(challengesWithProgress, request.status);
    
    // Apply pagination
    const paginatedChallenges = applyPagination(filteredChallenges, request.limit || 50, request.offset || 0);

    const response: GetChallengesResponse = {
      challenges: paginatedChallenges,
      total: filteredChallenges.length,
      hasMore: (request.offset || 0) + (request.limit || 50) < filteredChallenges.length,
    };

    console.log(`Returning ${paginatedChallenges.length} challenges out of ${filteredChallenges.length} total`);

    return successResponse(response, 200, event);

  } catch (error) {
    console.error('getChallenges error:', error);
    return internalErrorResponse('Failed to get challenges', error, event);
  }
}

async function getChallenges(request: GetChallengesRequest): Promise<Challenge[]> {
  let challenges: Challenge[] = [];

  // Build filter expression for scan
  let filterExpression: string | undefined;
  let expressionAttributeValues: Record<string, any> | undefined;
  let expressionAttributeNames: Record<string, string> | undefined;

  // Add search filter (searches metadata.title and metadata.description)
  if (request.search) {
    filterExpression = 'contains(#metadata.#title, :search) OR contains(#metadata.#description, :search)';
    expressionAttributeNames = {
      '#metadata': 'metadata',
      '#title': 'title',
      '#description': 'description',
    };
    expressionAttributeValues = {
      ':search': request.search,
    };
  }

  // Scan the challenges table
  const result = await scanItems<Challenge>(
    TABLES.CHALLENGES,
    filterExpression,
    expressionAttributeNames,
    expressionAttributeValues
  );

  challenges = result.items;

  // Sort by title only (sortOrder removed from schema)
  challenges.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));

  return challenges;
}

async function getUserProgress(userId: string): Promise<Record<string, UserProgress>> {
  const result = await queryItems<UserProgress>(
    TABLES.USER_PROGRESS,
    'userId = :userId',
    undefined,
    { ':userId': userId }
  );

  const progressMap: Record<string, UserProgress> = {};
  for (const progress of result.items) {
    progressMap[progress.challengeId] = progress;
  }

  return progressMap;
}

function combineWithProgress(challenges: Challenge[], userProgress: Record<string, UserProgress>): ChallengeWithProgress[] {
  return challenges.map(challenge => {
    const progress = userProgress[challenge.id];
    return {
      ...challenge,
      userProgress: progress,
    };
  });
}

function applyStatusFilter(challenges: ChallengeWithProgress[], status?: string): ChallengeWithProgress[] {
  if (!status || status === 'all') {
    return challenges;
  }

  return challenges.filter(challenge => {
    const userStatus = challenge.userProgress?.status || 'not_started';
    return userStatus === status;
  });
}

function applyPagination<T>(items: T[], limit: number, offset: number): T[] {
  return items.slice(offset, offset + limit);
}
