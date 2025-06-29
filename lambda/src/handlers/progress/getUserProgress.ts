// Get User Progress Lambda Function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserProgress } from '../../types';
import { successResponse, errorResponse, internalErrorResponse, getUserIdFromEvent } from '../../utils/response';
import { queryItems, TABLES } from '../../utils/dynamodb';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('getUserProgress event:', JSON.stringify(event, null, 2));

    // Extract user ID from Cognito claims
    const userId = getUserIdFromEvent(event);
    if (!userId) {
      return errorResponse({
        statusCode: 401,
        message: 'User not authenticated',
        code: 'UNAUTHORIZED',
      });
    }

    console.log(`Getting progress for user ${userId}`);

    // Get all progress records for the user
    const result = await queryItems<UserProgress>(
      TABLES.USER_PROGRESS,
      'userId = :userId',
      undefined,
      { ':userId': userId }
    );

    const progressRecords = result.items;

    // Calculate summary statistics
    const summary = calculateProgressSummary(progressRecords);

    const response = {
      progress: progressRecords,
      summary,
    };

    console.log(`Returning ${progressRecords.length} progress records for user ${userId}`);
    
    return successResponse(response);

  } catch (error) {
    console.error('getUserProgress error:', error);
    return internalErrorResponse('Failed to get user progress', error);
  }
}

interface ProgressSummary {
  totalChallenges: number;
  completedChallenges: number;
  inProgressChallenges: number;
  totalTimeSpent: number; // in minutes
  averageProgress: number; // 0-100
  completionRate: number; // 0-100
  totalAttempts: number;
  bestScores: {
    challengeId: string;
    score: number;
  }[];
}

function calculateProgressSummary(progressRecords: UserProgress[]): ProgressSummary {
  const totalChallenges = progressRecords.length;
  const completedChallenges = progressRecords.filter(p => p.status === 'completed').length;
  const inProgressChallenges = progressRecords.filter(p => p.status === 'in_progress').length;
  
  const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.timeSpent, 0);
  const totalProgress = progressRecords.reduce((sum, p) => sum + p.progress, 0);
  const averageProgress = totalChallenges > 0 ? totalProgress / totalChallenges : 0;
  const completionRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;
  const totalAttempts = progressRecords.reduce((sum, p) => sum + p.attempts, 0);
  
  const bestScores = progressRecords
    .filter(p => p.bestScore !== undefined)
    .map(p => ({
      challengeId: p.challengeId,
      score: p.bestScore!,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    totalChallenges,
    completedChallenges,
    inProgressChallenges,
    totalTimeSpent,
    averageProgress,
    completionRate,
    totalAttempts,
    bestScores,
  };
}
