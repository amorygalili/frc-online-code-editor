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
import { useConfig, buildSessionUrl } from './ConfigContext';

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
}

/**
 * BuildProvider component that manages build state and WebSocket connections
 */
export const BuildProvider: React.FC<BuildProviderProps> = ({
  children
}) => {
  const { config } = useConfig();

  // State
  const [currentBuildId, setCurrentBuildId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [buildOutput, setBuildOutput] = useState<BuildOutputMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentOperationType, setCurrentOperationType] = useState<'build' | 'simulation' | null>(null);

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
      // Determine if we should use secure WebSocket based on current page protocol
      const isSecure = window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss' : 'ws';

      // Check if serverUrl looks like an ALB domain (contains amazonaws.com or is not localhost)
      const isALBEndpoint = config.serverUrl.includes('amazonaws.com') ||
                           config.serverUrl.includes('elb.amazonaws.com') ||
                           (!config.serverUrl.includes('localhost') && !config.serverUrl.includes('127.0.0.1'));

      let wsUrl: string;
      if (isALBEndpoint) {
        // For ALB endpoints, don't include port - ALB handles routing
        wsUrl = `${wsProtocol}://${config.serverUrl}/session/${config.sessionId}/main/build`;
      } else {
        // For localhost/development, use the specific port
        wsUrl = `${wsProtocol}://${config.serverUrl}:30003/session/${config.sessionId}/main/build`;
      }

      console.log('Creating new WebSocket connection to:', wsUrl);
      console.log('- Protocol:', wsProtocol, '(secure:', isSecure, ')');
      console.log('- ALB endpoint:', isALBEndpoint);
      const ws = new WebSocket(wsUrl);
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
  }, [config]);

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

    // Check if this is a build or simulation output message by looking for buildId or simulationId
    const messageId = message.buildId || message.simulationId;
    if (messageId) {
      console.log('Message has ID:', messageId, 'type:', message.buildId ? 'build' : 'simulation');

      // If we don't have a current build ID, but we're getting messages,
      // it might be that the build/simulation started but we missed setting the ID
      if (!currentBuildId) {
        console.log('No current buildId, but received message with ID. Setting current buildId to:', messageId);
        setCurrentBuildId(messageId);
      }

      // Process the message if it matches our current build/simulation or if we just set it
      if (!currentBuildId || messageId === currentBuildId) {
        console.log('Processing output for ID:', messageId);

        // The server spreads the message object, so the final structure is:
        // { buildId/simulationId: '...', type: 'stdout'/'stderr'/'status'/'error', content: '...', ... }
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

        // Update status if it's a status message
        if (message.status) {
          console.log('Updating status to:', message.status);
          setBuildStatus(message.status);
          if (message.status === 'success' || message.status === 'failed' || message.status === 'error' || message.status === 'stopped') {
            console.log('Process completed, clearing currentBuildId and operation type');
            setCurrentBuildId(null);
            setCurrentOperationType(null);
          }
        }
      } else {
        console.log('Ignoring message for different ID:', messageId, 'current:', currentBuildId);
      }
    } else if (message.type === 'build_history' || message.type === 'simulation_history') {
      console.log('Received history with', message.output?.length, 'messages');
      if (message.output) {
        setBuildOutput(message.output);
      }
    } else {
      console.log('Unknown message type or no ID:', message);
    }
  }, [currentBuildId]);

  /**
   * Start a build
   */
  const startBuild = useCallback(async (projectName: string, task: BuildTask): Promise<string | null> => {
    try {
      const url = buildSessionUrl(config, `/main/wpilib/build/${projectName}`, 30003);
      const response = await fetch(url, {
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
        setCurrentOperationType('build');

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
  }, [config]);

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
   * Start a simulation
   */
  const startSimulation = useCallback(async (projectName: string, simulationType: string = 'debug'): Promise<string | null> => {
    try {
      const url = buildSessionUrl(config, `/main/wpilib/simulate/${projectName}`, 30003);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ simulationType }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.simulationId) {
        setCurrentBuildId(result.simulationId);
        setBuildStatus('running');
        setBuildOutput([]); // Clear previous output
        setCurrentOperationType('simulation');

        // Subscribe to simulation output (with retry if WebSocket not ready)
        const trySubscribe = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            subscribeToSimulation(result.simulationId);
          } else {
            console.log('WebSocket not ready, retrying subscription in 100ms');
            setTimeout(trySubscribe, 100);
          }
        };
        trySubscribe();

        return result.simulationId;
      } else {
        throw new Error(result.error || 'Failed to start simulation');
      }
    } catch (error) {
      console.error('Error starting simulation:', error);
      setBuildStatus('error');
      return null;
    }
  }, [config]);

  /**
   * Stop a simulation
   */
  const stopSimulation = useCallback(async (simulationId?: string): Promise<boolean> => {
    const idToStop = simulationId || currentBuildId;
    if (!idToStop) {
      console.warn('No simulation ID provided to stop');
      return false;
    }

    try {
      const url = buildSessionUrl(config, `/main/wpilib/simulate/${idToStop}/stop`, 30003);
      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setBuildStatus('success');
        return true;
      } else {
        throw new Error(result.error || 'Failed to stop simulation');
      }
    } catch (error) {
      console.error('Error stopping simulation:', error);
      return false;
    }
  }, [config, currentBuildId]);

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
   * Subscribe to a specific simulation
   */
  const subscribeToSimulation = useCallback((simulationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        simulationId
      }));
    }
  }, []);

  /**
   * Get build status
   */
  const getBuildStatus = useCallback(async (buildId: string): Promise<BuildStatusResponse | null> => {
    try {
      const url = buildSessionUrl(config, `/main/wpilib/build/${buildId}/status`, 30003);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting build status:', error);
      return null;
    }
  }, [config]);

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
    currentOperationType,
    startBuild,
    stopBuild,
    startSimulation,
    stopSimulation,
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