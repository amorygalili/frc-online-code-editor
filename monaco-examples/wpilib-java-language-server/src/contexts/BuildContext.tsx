/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  BuildContextType,
  BuildOutputMessage,
  BuildStatus,
  BuildTask,
  BuildResponse,
  BuildStatusResponse,
  BuildWebSocketMessage,
} from '../types/build';

const BuildContext = createContext<BuildContextType | undefined>(undefined);

/**
 * Hook to use the build context
 */
export const useBuild = (): BuildContextType => {
  const context = useContext(BuildContext);
  if (!context) {
    throw new Error('useBuild must be used within a BuildProvider');
  }
  return context;
};

interface BuildProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
}

/**
 * BuildProvider component that manages build state and WebSocket connections
 */
export const BuildProvider: React.FC<BuildProviderProps> = ({
  children,
  serverUrl = 'ws://localhost:30003'
}) => {
  // State
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [buildOutput, setBuildOutput] = useState<BuildOutputMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Connect to build WebSocket
   */
  const connect = useCallback(() => {
    // Don't create multiple connections
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      console.log('Closing existing WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log('Creating new WebSocket connection to:', `${serverUrl}/build`, wsRef.current);
      const ws = new WebSocket(`${serverUrl}/build`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to build WebSocket');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: BuildWebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing build WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Build WebSocket connection closed');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('Build WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error creating build WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [serverUrl]);

  /**
   * Disconnect from build WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('Received WebSocket message:', {message, currentBuildId});

    // Check if this is a build output message by looking for buildId
    if (message.buildId) {
      console.log('Message has buildId:', message.buildId);

      // If we don't have a current build ID, but we're getting messages,
      // it might be that the build started but we missed setting the ID
      if (!currentBuildId) {
        console.log('No current buildId, but received message with buildId. Setting current buildId to:', message.buildId);
        setCurrentBuildId(message.buildId);
      }

      // Process the message if it matches our current build or if we just set it
      if (!currentBuildId || message.buildId === currentBuildId) {
      console.log('Processing build output for current build:', currentBuildId);

      // The server spreads the message object, so the final structure is:
      // { buildId: '...', type: 'stdout'/'stderr'/'status'/'error', content: '...', ... }
      const outputMessage: BuildOutputMessage = {
        type: message.type || 'stdout',
        content: message.content || '',
        status: message.status,
        exitCode: message.exitCode,
        error: message.error,
        timestamp: message.timestamp || new Date().toISOString()
      };

      console.log('Adding output message:', outputMessage);
      setBuildOutput(prev => [...prev, outputMessage]);

      // Update build status if it's a status message
      if (message.status) {
        console.log('Updating build status to:', message.status);
        setBuildStatus(message.status);
        if (message.status === 'success' || message.status === 'failed' || message.status === 'error') {
          console.log('Build completed, clearing currentBuildId');
          setCurrentBuildId(null);
        }
      }
      } else {
        console.log('Ignoring message for different build:', message.buildId, 'current:', currentBuildId);
      }
    } else if (message.type === 'build_history') {
      console.log('Received build history with', message.output?.length, 'messages');
      if (message.output) {
        setBuildOutput(message.output);
      }
    } else {
      console.log('Unknown message type or no buildId:', message);
    }
  }, [currentBuildId]);

  /**
   * Start a build
   */
  const startBuild = useCallback(async (projectName: string, task: BuildTask): Promise<string | null> => {
    try {
      const response = await fetch(`http://localhost:30003/wpilib/build/${projectName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: BuildResponse = await response.json();

      if (result.success && result.buildId) {
        setCurrentBuildId(result.buildId);
        setBuildStatus('running');
        setBuildOutput([]); // Clear previous output

        // Subscribe to build output
        subscribeToBuild(result.buildId);

        return result.buildId;
      } else {
        throw new Error(result.error || 'Failed to start build');
      }
    } catch (error) {
      console.error('Error starting build:', error);
      setBuildStatus('error');
      return null;
    }
  }, []);

  /**
   * Stop a build
   */
  const stopBuild = useCallback(async (buildId: string): Promise<void> => {
    try {
      // Note: This would need to be implemented on the server side
      // For now, we just reset the local state
      if (buildId === currentBuildId) {
        setCurrentBuildId(null);
        setBuildStatus('idle');
      }
    } catch (error) {
      console.error('Error stopping build:', error);
    }
  }, [currentBuildId]);

  /**
   * Clear build output
   */
  const clearOutput = useCallback(() => {
    setBuildOutput([]);
  }, []);

  /**
   * Subscribe to a specific build
   */
  const subscribeToBuild = useCallback((buildId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        buildId
      }));
    }
  }, []);

  /**
   * Get build status
   */
  const getBuildStatus = useCallback(async (buildId: string): Promise<BuildStatusResponse | null> => {
    try {
      const response = await fetch(`http://localhost:30003/wpilib/build/${buildId}/status`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting build status:', error);
      return null;
    }
  }, []);

  // Connect to WebSocket on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Context value
  const contextValue: BuildContextType = {
    currentBuildId,
    buildStatus,
    buildOutput,
    startBuild,
    stopBuild,
    clearOutput,
    isConnected,
    connect,
    disconnect,
    subscribeToBuild,
    getBuildStatus,
  };

  return (
    <BuildContext.Provider value={contextValue}>
      {children}
    </BuildContext.Provider>
  );
};

export default BuildProvider;