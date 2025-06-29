// Shared types for the FRC Challenge Platform Lambda functions

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  learningObjectives: string[];
  instructions: string;
  hints?: string[];
  starterCode?: string;
  solutionCode?: string;
  testCases?: TestCase[];
  tags: string[];
  prerequisites?: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input?: any;
  expectedOutput?: any;
  testCode: string;
  points: number;
}

export interface UserProgress {
  userId: string;
  challengeId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number; // 0-100
  lastCode?: string;
  completedAt?: string;
  timeSpent: number; // in minutes
  attempts: number;
  bestScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeSession {
  sessionId: string;
  userId: string;
  challengeId: string;
  currentCode: string;
  status: 'active' | 'completed' | 'abandoned';
  startedAt: string;
  lastSavedAt: string;
  completedAt?: string;
  testResults?: TestResult[];
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  output?: string;
  error?: string;
  executionTime: number;
  points: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

// API Request/Response types
export interface GetChallengesRequest {
  category?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GetChallengesResponse {
  challenges: ChallengeWithProgress[];
  total: number;
  hasMore: boolean;
}

export interface ChallengeWithProgress extends Challenge {
  userProgress?: UserProgress;
}

export interface UpdateProgressRequest {
  status?: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  lastCode?: string;
  timeSpent?: number;
}

export interface CreateSessionRequest {
  challengeId: string;
}

export interface SaveCodeRequest {
  code: string;
  testResults?: TestResult[];
}

// Error types
export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  details?: any;
}

// Lambda response helpers
export interface ApiResponse {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': string;
  };
  body: string;
}

// DynamoDB item types (with DynamoDB-specific fields)
export interface ChallengeItem extends Challenge {
  GSI1PK?: string; // For category index
  GSI2PK?: string; // For difficulty index
}

export interface UserProgressItem extends UserProgress {
  GSI1PK?: string; // For challenge index
}

export interface ChallengeSessionItem extends ChallengeSession {
  GSI1PK?: string; // For user index
  GSI2PK?: string; // For challenge index
  TTL?: number; // For automatic cleanup of old sessions
}
