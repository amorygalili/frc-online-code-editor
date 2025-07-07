import React, { ReactNode } from 'react';
import { NT4Provider } from '../nt4/useNetworktables';
import { HalSimProvider } from './HalSimContext';
import { ChallengeSession } from '../services/challengeService';

interface SessionAwareProvidersProps {
  children: ReactNode;
  session: ChallengeSession;
}

/**
 * Enhanced providers that can handle ALB-routed WebSocket connections
 * for containerized challenge sessions.
 */
export const SessionAwareProviders: React.FC<SessionAwareProvidersProps> = ({ 
  children, 
  session 
}) => {
  const containerInfo = session.containerInfo;

  // Extract connection parameters from session container info
  const getConnectionParams = () => {
    // Default to localhost for development/fallback
    let nt4ServerAddress = 'localhost';
    let halSimHostname = 'localhost';
    let halSimPort = 3300;
    let useALBRouting = false;

    // Check for ALB endpoints first (preferred for containerized sessions)
    if (containerInfo?.albEndpoints?.main) {
      try {
        const mainUrl = new URL(containerInfo.albEndpoints.main);
        const baseHostname = mainUrl.hostname;
        const isSecure = mainUrl.protocol === 'https:';

        // For ALB routing, we need to configure the clients to connect to port 80/443
        // with custom paths that the ALB will route to the container ports

        // NT4: ALB should route /session/sessionId/nt4 -> container:5810
        // We'll configure NT4 to connect to the ALB hostname on port 80/443
        nt4ServerAddress = baseHostname;

        // HAL WebSocket: ALB should route /session/sessionId/hal -> container:3300
        // We'll configure HAL to connect to the ALB hostname on port 80/443
        halSimHostname = baseHostname;
        halSimPort = isSecure ? 443 : 80;
        useALBRouting = true;

        console.log('Using ALB endpoints for WebSocket connections:');
        console.log('- Main endpoint:', containerInfo.albEndpoints.main);
        console.log('- Protocol:', isSecure ? 'wss' : 'ws');
        console.log('- NT4 server address:', nt4ServerAddress);
        console.log('- HAL sim hostname:', halSimHostname, 'port:', halSimPort);
        console.log('- ALB routing enabled');

      } catch (error) {
        console.warn('Invalid ALB main endpoint:', containerInfo.albEndpoints.main, error);
      }
    }

    // Fallback to direct URLs if ALB endpoints not available
    if (!useALBRouting) {
      if (containerInfo?.nt4Url) {
        try {
          const nt4Url = new URL(containerInfo.nt4Url);
          nt4ServerAddress = nt4Url.hostname;
          console.log('Using direct NT4 URL:', containerInfo.nt4Url);
        } catch (error) {
          console.warn('Invalid NT4 URL from container:', containerInfo.nt4Url, error);
        }
      }

      if (containerInfo?.halWebSocketUrl) {
        try {
          const halUrl = new URL(containerInfo.halWebSocketUrl);
          halSimHostname = halUrl.hostname;
          halSimPort = parseInt(halUrl.port) || 3300;
          console.log('Using direct HAL WebSocket URL:', containerInfo.halWebSocketUrl);
        } catch (error) {
          console.warn('Invalid HAL WebSocket URL from container:', containerInfo.halWebSocketUrl, error);
        }
      }
    }

    return {
      nt4ServerAddress,
      halSimHostname,
      halSimPort,
      useALBRouting
    };
  };

  const { nt4ServerAddress, halSimHostname, halSimPort, useALBRouting } = getConnectionParams();

  console.log('Session-aware providers configuration:');
  console.log('- NT4 server address:', nt4ServerAddress);
  console.log('- HAL sim hostname:', halSimHostname, 'port:', halSimPort);
  console.log('- Using ALB routing:', useALBRouting);
  console.log('- Container info:', containerInfo);

  // Log the expected WebSocket URLs for debugging
  if (useALBRouting && containerInfo?.albEndpoints?.main) {
    console.log('ALB routing enabled - using server.js proxy endpoints');
    console.log('Backend ALB routing rules required for proper WebSocket connections');
  }

  // Choose providers based on routing type
  if (useALBRouting && containerInfo?.albEndpoints?.main) {
    // Use proxy endpoints through the container's server.js
    const sessionId = session.sessionId;
    const mainUrl = new URL(containerInfo.albEndpoints.main);
    const isSecure = mainUrl.protocol === 'https:';

    // The server.js proxy will handle the translation to localhost:5810 and localhost:3300
    // Frontend connects to ALB -> ALB routes to container:30003 -> server.js proxies to actual services
    const proxyBaseUrl = `${isSecure ? 'wss' : 'ws'}://${mainUrl.hostname}`;

    // Use session-specific proxy endpoints
    const nt4ProxyUrl = `${proxyBaseUrl}/session/${sessionId}/nt4`;
    const halProxyUrl = `${proxyBaseUrl}/session/${sessionId}/halsim`;

    console.log('Using ALB proxy endpoints:');
    console.log('- NT4 Proxy URL:', nt4ProxyUrl);
    console.log('- HAL Proxy URL:', halProxyUrl);
    console.log('- Server.js will proxy NT4 to localhost:5810/nt/frc-challenges');
    console.log('- Server.js will proxy HAL to localhost:3300/wpilibws');

    // Configure providers to use the proxy endpoints
    // We need to extract hostname and port from the proxy URLs for the providers
    const proxyHostname = mainUrl.hostname;
    const proxyPort = isSecure ? 443 : 80;

    return (
      <CustomNT4Provider
        websocketUrl={nt4ProxyUrl}
        serverAddress={proxyHostname}
      >
        <CustomHalSimProvider
          websocketUrl={halProxyUrl}
          hostname={proxyHostname}
          port={30005}
          sessionId={sessionId}
        >
          {children}
        </CustomHalSimProvider>
      </CustomNT4Provider>
    );
  } else {
    // Use standard providers for direct connections (development/localhost)
    return (
      <NT4Provider serverAddress={nt4ServerAddress} sessionId={null}>
        <HalSimProvider hostname={halSimHostname} port={halSimPort}>
          {children}
        </HalSimProvider>
      </NT4Provider>
    );
  }
};

/**
 * Custom NT4 Provider that can handle full WebSocket URLs for ALB routing
 */
export const CustomNT4Provider: React.FC<{
  children: ReactNode;
  websocketUrl?: string;
  serverAddress?: string;
}> = ({ children, websocketUrl, serverAddress }) => {
  const address = serverAddress || 'localhost';

  if (websocketUrl) {
    console.log('CustomNT4Provider: Using proxy WebSocket URL:', websocketUrl);

    // For proxy routing, we need to extract the hostname, port, and sessionId from the WebSocket URL
    // The server.js proxy will handle the path routing
    try {
      const url = new URL(websocketUrl);
      const proxyHostname = url.hostname;
      const proxyPort = url.port ? parseInt(url.port) : (url.protocol === 'wss:' ? 443 : 80);

      // Extract sessionId from the path: /session/{SESSION_ID}/nt4
      const pathMatch = url.pathname.match(/^\/session\/([^\/]+)\/nt4?$/);
      const sessionId = pathMatch ? pathMatch[1] : null;

      console.log('CustomNT4Provider: Connecting to proxy at:', proxyHostname, 'port:', proxyPort);
      console.log('CustomNT4Provider: Session ID:', sessionId);
      console.log('CustomNT4Provider: Proxy will route to localhost:5810/nt/frc-challenges');

      // Use the proxy hostname with the extracted sessionId
      // The NT4_Client will construct: ws://hostname:port/session/{sessionId}/nt/{appName}
      return (
        <NT4Provider
          serverAddress={proxyHostname}
          sessionId={sessionId}
          appName="frc-challenges"
        >
          {children}
        </NT4Provider>
      );
    } catch (error) {
      console.warn('CustomNT4Provider: Invalid WebSocket URL:', websocketUrl, error);
    }
  }

  // Fallback to standard provider (no sessionId for direct connections)
  return (
    <NT4Provider serverAddress={address} sessionId={null}>
      {children}
    </NT4Provider>
  );
};

/**
 * Custom HAL Sim Provider that can handle full WebSocket URLs for ALB routing
 */
export const CustomHalSimProvider: React.FC<{
  children: ReactNode;
  websocketUrl?: string;
  hostname?: string;
  port?: number;
  sessionId?: string;
}> = ({ children, websocketUrl, hostname = 'localhost', port = 3300, sessionId }) => {

  if (websocketUrl && sessionId) {
    console.log('CustomHalSimProvider: Using session-aware WebSocket URL:', websocketUrl);

    // For session routing, extract hostname and port from the WebSocket URL
    try {
      const url = new URL(websocketUrl);
      const customHostname = url.hostname;
      const customPort = url.port ? parseInt(url.port) : (url.protocol === 'wss:' ? 443 : 80);

      console.log('CustomHalSimProvider: Extracted hostname:', customHostname, 'port:', customPort);
      console.log('CustomHalSimProvider: Session ID:', sessionId);
      console.log('CustomHalSimProvider: Will connect to halsim-proxy on port:', customPort);

      // Pass sessionId to HalSimProvider so it can construct the correct URI
      // The HalSimProvider will construct: ws://hostname:port/session/{sessionId}/halsim/ws
      return (
        <HalSimProvider
          hostname={customHostname}
          port={customPort}
          sessionId={sessionId}
        >
          {children}
        </HalSimProvider>
      );
    } catch (error) {
      console.warn('CustomHalSimProvider: Invalid WebSocket URL:', websocketUrl, error);
    }
  }

  // Fallback to standard provider (no session routing)
  return (
    <HalSimProvider hostname={hostname} port={port} sessionId={sessionId}>
      {children}
    </HalSimProvider>
  );
};
