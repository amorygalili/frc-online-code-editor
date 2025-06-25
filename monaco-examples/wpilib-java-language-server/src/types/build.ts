/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

/**
 * Build output message types
 */
export interface BuildOutputMessage {
  type: 'stdout' | 'stderr' | 'status' | 'error';
  content?: string;
  status?: BuildStatus;
  exitCode?: number;
  error?: string;
  timestamp: string;
}

/**
 * Build WebSocket message types
 */
export interface BuildWebSocketMessage {
  type: 'build_output' | 'build_history' | 'subscribe';
  buildId: string;
  output?: BuildOutputMessage[];
  stdout?: string;
  stderr?: string;
  status?: BuildStatus;
  exitCode?: number;
  error?: string;
  timestamp?: string;
}

/**
 * Build status enumeration
 */
export type BuildStatus = 'idle' | 'running' | 'success' | 'failed' | 'error';

/**
 * Build task types
 */
export type BuildTask = 'build' | 'clean' | 'deploy' | 'test' | 'assemble';

/**
 * Build request interface
 */
export interface BuildRequest {
  projectName: string;
  task: BuildTask;
}

/**
 * Build response interface
 */
export interface BuildResponse {
  success: boolean;
  buildId?: string;
  projectName?: string;
  task?: BuildTask;
  status?: BuildStatus;
  message?: string;
  error?: string;
}

/**
 * Build status response interface
 */
export interface BuildStatusResponse {
  buildId: string;
  status: BuildStatus;
  task: BuildTask;
  startTime?: string;
  endTime?: string;
  exitCode?: number;
  error?: string;
  outputLines?: number;
}

/**
 * Build console props
 */
export interface BuildConsoleProps {
  buildId?: string;
  maxLines?: number;
  autoScroll?: boolean;
  className?: string;
}

/**
 * Build controls props
 */
export interface BuildControlsProps {
  projectName?: string;
  onBuildStart?: (buildId: string) => void;
  onBuildComplete?: (buildId: string, status: BuildStatus) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Build context interface
 */
export interface BuildContextType {
  // Current build state
  currentBuildId: string | null;
  buildStatus: BuildStatus;
  buildOutput: BuildOutputMessage[];
  
  // Build actions
  startBuild: (projectName: string, task: BuildTask) => Promise<string | null>;
  stopBuild: (buildId: string) => Promise<void>;
  clearOutput: () => void;
  
  // WebSocket connection
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  
  // Build history
  subscribeToBuild: (buildId: string) => void;
  getBuildStatus: (buildId: string) => Promise<BuildStatusResponse | null>;
}

/**
 * Build output line interface
 */
export interface BuildOutputLine {
  id: string;
  type: 'stdout' | 'stderr' | 'status' | 'error';
  content: string;
  timestamp: string;
  className?: string;
}

/**
 * Build statistics interface
 */
export interface BuildStatistics {
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  averageBuildTime: number;
  lastBuildTime?: string;
}
