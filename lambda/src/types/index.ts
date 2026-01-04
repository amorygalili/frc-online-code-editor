// Shared types for the FRC Challenge Platform Lambda functions
// Re-export Challenge types from the simplified schema
export { Challenge, ChallengeWithProgress, ChallengeFilters } from './challenge';

export interface UserProgress {
  userId: string;
  challengeId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

// Import for type usage
import { ChallengeWithProgress } from './challenge';

export interface GetChallengesResponse {
  challenges: ChallengeWithProgress[];
  total: number;
  hasMore: boolean;
}

export interface UpdateProgressRequest {
  status?: 'not_started' | 'in_progress' | 'completed';
}

export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  details?: any;
}

// ============================================================================
// Session Types - Shared between Lambda and Frontend
// ============================================================================

export type SessionStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
export type ResourceProfile = 'development' | 'basic' | 'advanced' | 'competition';

/**
 * Container endpoints for the session
 * Structure matches frontend ChallengeSession.containerInfo.albEndpoints
 */
export interface ContainerEndpoints {
  main?: string;        // http://host:port/ - Main API/editor endpoint
  nt4?: string;         // ws://host:port/ - NetworkTables 4 WebSocket
  halsim?: string;      // ws://host:port/ - HALSim WebSocket
  jdtls?: string;       // ws://host:port/ - Java Language Server
  health?: string;      // http://host:port/health - Health check endpoint
}

/**
 * Container information including task details and endpoints
 */
export interface ContainerInfo {
  taskArn?: string;
  publicIp?: string;
  albEndpoints?: ContainerEndpoints;
}

/**
 * Session response structure - used by all session endpoints
 * This structure matches the frontend ChallengeSession interface
 */
export interface SessionResponse {
  sessionId: string;
  userId: string;
  challengeId: string;
  status: SessionStatus;
  containerInfo?: ContainerInfo;
  resourceProfile?: ResourceProfile;
  createdAt?: string;
  updatedAt?: string;
  lastActivity?: string;
  expiresAt?: string;
  // Additional computed fields
  remainingMinutes?: number;
  isExpired?: boolean;
  healthStatus?: string;
}

/**
 * Internal session record as stored in DynamoDB
 * Contains additional fields not exposed in API response
 */
export interface SessionRecord {
  sessionId: string;
  userId: string;
  challengeId: string;
  currentChallengeId?: string;
  status: SessionStatus;
  taskArn: string;
  resourceProfile: ResourceProfile;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
  terminatedAt?: string;
  // Endpoint fields (flat storage in DynamoDB)
  containerEndpoint?: string;
  nt4Endpoint?: string;
  halsimEndpoint?: string;
  jdtlsEndpoint?: string;
  healthEndpoint?: string;
  // ALB integration details
  mainTargetGroupArn?: string;
  nt4TargetGroupArn?: string;
  halsimTargetGroupArn?: string;
  jdtlsTargetGroupArn?: string;
  mainRuleArn?: string;
  nt4RuleArn?: string;
  halsimRuleArn?: string;
  jdtlsRuleArn?: string;
  // Local dev flag
  isLocalDev?: boolean;
}

/**
 * Convert a DynamoDB session record to the API response format
 */
export function formatSessionResponse(record: SessionRecord, options?: {
  includeTaskArn?: boolean;
  computeRemainingTime?: boolean;
}): SessionResponse {
  const now = new Date();
  const expiresAt = record.expiresAt ? new Date(record.expiresAt) : null;

  // Build containerInfo only for running sessions
  const containerInfo: ContainerInfo | undefined =
    (record.status === 'running' || record.status === 'starting') ? {
      taskArn: options?.includeTaskArn ? record.taskArn : undefined,
      albEndpoints: {
        main: record.containerEndpoint,
        nt4: record.nt4Endpoint,
        halsim: record.halsimEndpoint,
        jdtls: record.jdtlsEndpoint,
        health: record.healthEndpoint,
      },
    } : undefined;

  const response: SessionResponse = {
    sessionId: record.sessionId,
    userId: record.userId,
    challengeId: record.challengeId,
    status: record.status,
    containerInfo,
    resourceProfile: record.resourceProfile,
    createdAt: record.createdAt,
    lastActivity: record.lastActivity,
    expiresAt: record.expiresAt,
  };

  // Add computed fields if requested
  if (options?.computeRemainingTime && expiresAt) {
    response.remainingMinutes = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)));
    response.isExpired = now > expiresAt;
  }

  return response;
}
