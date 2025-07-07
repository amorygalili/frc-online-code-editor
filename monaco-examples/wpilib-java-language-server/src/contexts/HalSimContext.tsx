import React, { createContext, useContext, useRef, useState, useEffect, ReactNode, memo } from 'react';
import {
  WPILibWebSocketClient,
  DriverStationPayload,
  AccelPayload,
  AddressableLEDPayload,
  AIPayload,
  DIOPayload,
  dPWMPayload,
  DutyCyclePayload,
  EncoderPayload,
  GyroPayload,
  JoystickPayload,
  PWMPayload,
  RelayPayload,
  RoboRIOPayload,
  SimDevicePayload
} from '@frc-web-components/node-wpilib-ws';

// Robot modes enum for better type safety
export enum RobotMode {
  DISABLED = 'disabled',
  AUTONOMOUS = 'autonomous',
  TELEOP = 'teleop',
  TEST = 'test'
}

// HAL Simulation data structures
export interface HalSimDeviceData {
  type: string;
  device: string;
  data: any;
  timestamp: number;
}

export interface HalSimDataMap {
  [deviceType: string]: {
    [deviceId: string]: HalSimDeviceData;
  };
}

// Context types
interface HalSimContextType {
  client: WPILibWebSocketClient | null;
  connected: boolean;
  driverStationData: DriverStationPayload;
  halSimData: HalSimDataMap;
  setRobotMode: (mode: RobotMode) => void;
  setRobotEnabled: (enabled: boolean) => void;
}

interface HalSimProviderProps {
  children: ReactNode;
  hostname?: string;
  port?: number;
  sessionId?: string | null;
}

// Create context
const HalSimContext = createContext<HalSimContextType | null>(null);

// Provider component
export const HalSimProvider: React.FC<HalSimProviderProps> = memo(({
  children,
  hostname = 'localhost',
  port = 30005,
  sessionId = null,
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
  const [halSimData, setHalSimData] = useState<HalSimDataMap>({});

  useEffect(() => {

    if (clientRef.current || !sessionId) {
      return;
    }

    // Construct the URI based on whether we have a session ID
    let clientUri = `/session/${sessionId}/halsim`;
    console.log(`HAL Sim using session routing: ${clientUri}`);

    
    const client = new WPILibWebSocketClient({
      hostname,
      port,
      uri: clientUri
    });

    console.log(`HAL Sim WebSocket client created for ws://${hostname}:${port}${clientUri}`);

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

    // Helper function to update HAL simulation data
    const updateHalSimData = (type: string, device: string, data: any) => {
      setHalSimData(prevData => ({
        ...prevData,
        [type]: {
          ...prevData[type],
          [device]: {
            type,
            device,
            data,
            timestamp: Date.now()
          }
        }
      }));
    };

    // Listen for various HAL simulation events
    client.on('analogInEvent', (channel: number, payload: AIPayload) => {
      updateHalSimData('AI', channel.toString(), payload);
    });

    client.on('dioEvent', (channel: number, payload: DIOPayload) => {
      updateHalSimData('DIO', channel.toString(), payload);
    });

    client.on('pwmEvent', (channel: number, payload: PWMPayload) => {
      updateHalSimData('PWM', channel.toString(), payload);
    });

    client.on('encoderEvent', (channel: number, payload: EncoderPayload) => {
      updateHalSimData('Encoder', channel.toString(), payload);
    });

    client.on('gyroEvent', (deviceName: string, deviceChannel: number | null, payload: GyroPayload) => {
      const deviceId = deviceChannel !== null ? `${deviceName}[${deviceChannel}]` : deviceName;
      updateHalSimData('Gyro', deviceId, payload);
    });

    client.on('accelEvent', (deviceName: string, deviceChannel: number | null, payload: AccelPayload) => {
      const deviceId = deviceChannel !== null ? `${deviceName}[${deviceChannel}]` : deviceName;
      updateHalSimData('Accel', deviceId, payload);
    });

    client.on('relayEvent', (channel: number, payload: RelayPayload) => {
      updateHalSimData('Relay', channel.toString(), payload);
    });

    client.on('dpwmEvent', (channel: number, payload: dPWMPayload) => {
      updateHalSimData('dPWM', channel.toString(), payload);
    });

    client.on('dutyCycleEvent', (channel: number, payload: DutyCyclePayload) => {
      updateHalSimData('DutyCycle', channel.toString(), payload);
    });

    client.on('joystickEvent', (channel: number, payload: JoystickPayload) => {
      updateHalSimData('Joystick', channel.toString(), payload);
    });

    client.on('roboRioEvent', (payload: RoboRIOPayload) => {
      updateHalSimData('RoboRIO', 'main', payload);
    });

    client.on('addressableLEDEvent', (payload: AddressableLEDPayload) => {
      updateHalSimData('AddressableLED', 'main', payload);
    });

    client.on('simDeviceEvent', (deviceName: string, deviceIndex: number | null, deviceChannel: number | null, payload: SimDevicePayload) => {
      let deviceId = deviceName;
      if (deviceIndex !== null) {
        if (deviceChannel !== null) {
          deviceId += `[${deviceIndex},${deviceChannel}]`;
        } else {
          deviceId += `[${deviceIndex}]`;
        }
      }
      updateHalSimData('SimDevice', deviceId, payload);
    });

    // // Start the client
    client.start();

    // return () => {
    //   if (clientRef.current) {
    //     // Clean up the client connection
    //     clientRef.current.removeAllListeners();
    //   }
    // };
  }, [hostname, port, sessionId]);

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
    halSimData,
    setRobotMode,
    setRobotEnabled,
  };

  return (
    <HalSimContext.Provider value={contextValue}>
      {children}
    </HalSimContext.Provider>
  );
});

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

// Custom hook for HAL simulation data
export const useHalSimData = () => {
  const { halSimData, connected } = useHalSim();

  return {
    halSimData,
    connected,
    deviceTypes: Object.keys(halSimData),
    getDeviceData: (type: string, device: string) => halSimData[type]?.[device],
    getAllDevicesOfType: (type: string) => halSimData[type] || {}
  };
};
