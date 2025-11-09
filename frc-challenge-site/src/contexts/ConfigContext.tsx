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