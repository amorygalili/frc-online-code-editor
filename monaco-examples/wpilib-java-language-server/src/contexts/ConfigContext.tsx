/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { createContext, useContext, ReactNode } from 'react';

// Configuration interface for session-aware endpoints
export interface AppConfig {
  serverUrl: string;
  sessionId: string;
}

// Context type
interface ConfigContextType {
  config: AppConfig;
}

// Create the context
const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// Hook to use the config context
export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

// Provider component
interface ConfigProviderProps {
  children: ReactNode;
  config: AppConfig;
}

export function ConfigProvider({ children, config }: ConfigProviderProps) {
  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
}

// Helper function to build session-aware URLs
export function buildSessionUrl(config: AppConfig, endpoint: string, port: number): string {
  // Determine if we should use HTTPS based on current page protocol
  const isSecure = window.location.protocol === 'https:';
  const protocol = isSecure ? 'https' : 'http';

  // Check if serverUrl looks like an ALB domain
  const isALBEndpoint = config.serverUrl.includes('amazonaws.com') ||
                       config.serverUrl.includes('elb.amazonaws.com') ||
                       (!config.serverUrl.includes('localhost') && !config.serverUrl.includes('127.0.0.1'));

  let baseUrl: string;
  if (isALBEndpoint) {
    // For ALB endpoints, don't include port - ALB handles routing internally
    baseUrl = `${protocol}://${config.serverUrl}`;
  } else {
    // For localhost/development, use the specific port
    baseUrl = `${protocol}://${config.serverUrl}:${port}`;
  }

  const sessionPrefix = `/session/${config.sessionId}`;
  return `${baseUrl}${sessionPrefix}${endpoint}`;
}
