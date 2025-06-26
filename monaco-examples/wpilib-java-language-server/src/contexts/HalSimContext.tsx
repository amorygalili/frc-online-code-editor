import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { WPILibWebSocketClient, DriverStationPayload } from '@frc-web-components/node-wpilib-ws';

// Robot modes enum for better type safety
export enum RobotMode {
  DISABLED = 'disabled',
  AUTONOMOUS = 'autonomous', 
  TELEOP = 'teleop',
  TEST = 'test'
}

// Context types
interface HalSimContextType {
  client: WPILibWebSocketClient | null;
  connected: boolean;
  driverStationData: DriverStationPayload;
  setRobotMode: (mode: RobotMode) => void;
  setRobotEnabled: (enabled: boolean) => void;
}

interface HalSimProviderProps {
  children: ReactNode;
  hostname?: string;
  port?: number;
}

// Create context
const HalSimContext = createContext<HalSimContextType | null>(null);

// Provider component
export const HalSimProvider: React.FC<HalSimProviderProps> = ({
  children,
  hostname = 'localhost',
  port = 3300
}) => {
  const clientRef = useRef<WPILibWebSocketClient | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [driverStationData, setDriverStationData] = useState<DriverStationPayload>({
    '>enabled': false,
    '>autonomous': false,
    '>test': false,
    '>estop': false,
    '>fms': false,
    '>ds': true,
    '>station': 'Red-1',
    '>match_time': 0,
    '>new_data': false
  });

  useEffect(() => {

    if (clientRef.current) {
      return;
    }

    const client = new WPILibWebSocketClient();

    console.log("HAL Sim WebSocket client created");

    clientRef.current = client;

    client.on('closeConnection', () => {
      console.log('HAL Sim WebSocket connection closed');
      setConnected(false);
    });

    // Set up event listeners
    client.on('ready', () => {
      console.log(`HAL Sim WebSocket connected to ws://${hostname}:${port}/wpilibws`);
      setConnected(true);
    });

    client.on('openConnection', () => {
      console.log('HAL Sim WebSocket connection opened');
      setConnected(true);
    });

    client.on('closeConnection', () => {
      console.log('HAL Sim WebSocket disconnected');
      setConnected(false);
    });

    client.on('error', (code: number, reason: string) => {
      console.error(`HAL Sim WebSocket error [${code}]:`, reason);
      console.error(`Attempted connection to: ws://${hostname}:${port}/wpilibws`);
      setConnected(false);
    });

    // Listen for driver station events
    client.on('driverStationEvent', (payload: DriverStationPayload) => {
      console.log("driverStationEvent:", payload);
      setDriverStationData(prevData => ({
        ...prevData,
        ...payload
      }));
    });

    // // Start the client
    client.start();

    // return () => {
    //   if (clientRef.current) {
    //     // Clean up the client connection
    //     clientRef.current.removeAllListeners();
    //   }
    // };
  }, [hostname, port]);

  const setRobotMode = (mode: RobotMode) => {
    if (!clientRef.current) return;

    const payload: DriverStationPayload = {
      '>autonomous': mode === RobotMode.AUTONOMOUS,
      '>test': mode === RobotMode.TEST,
      '>new_data': true
    };

    clientRef.current.driverStationUpdateToWpilib(payload);
    
    // Update local state
    setDriverStationData(prevData => ({
      ...prevData,
      ...payload
    }));
  };

  const setRobotEnabled = (enabled: boolean) => {
    if (!clientRef.current) return;

    const payload: DriverStationPayload = {
      '>enabled': enabled,
      '>new_data': true
    };

    clientRef.current.driverStationUpdateToWpilib(payload);
    
    // Update local state
    setDriverStationData(prevData => ({
      ...prevData,
      ...payload
    }));
  };

  const contextValue: HalSimContextType = {
    client: clientRef.current,
    connected,
    driverStationData,
    setRobotMode,
    setRobotEnabled,
  };

  return (
    <HalSimContext.Provider value={contextValue}>
      {children}
    </HalSimContext.Provider>
  );
};

// Custom hook to use HAL Sim client
export const useHalSim = (): HalSimContextType => {
  const context = useContext(HalSimContext);
  if (!context) {
    throw new Error('useHalSim must be used within a HalSimProvider');
  }
  return context;
};

// Custom hook specifically for driver station data
export const useDriverStation = () => {
  const { driverStationData, setRobotMode, setRobotEnabled, connected } = useHalSim();
  
  // Derive current robot mode from driver station data
  const getCurrentMode = (): RobotMode => {
    if (driverStationData['>test']) return RobotMode.TEST;
    if (driverStationData['>autonomous']) return RobotMode.AUTONOMOUS;
    if (driverStationData['>enabled']) return RobotMode.TELEOP;
    return RobotMode.DISABLED;
  };

  return {
    driverStationData,
    currentMode: getCurrentMode(),
    isEnabled: driverStationData['>enabled'] || false,
    isConnected: connected,
    setRobotMode,
    setRobotEnabled
  };
};
