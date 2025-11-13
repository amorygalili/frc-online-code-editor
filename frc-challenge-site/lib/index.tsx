import { type DriverStationPayload } from "@frc-web-components/node-wpilib-ws";

// Types from HalSimContext
export enum RobotMode {
  DISABLED = "disabled",
  AUTONOMOUS = "autonomous",
  TELEOP = "teleop",
  TEST = "test",
}

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

// API functions that delegate to the global frcChallengeApi object
export async function mountEditor(element: HTMLElement) {
  return (window as any).frcChallengeApi.mountEditor(element);
}

export function setSimVisualization(element: JSX.Element) {
  return (window as any).frcChallengeApi.setSimVisualization(element);
}

export function getSimVisualization(): JSX.Element {
  return (window as any).frcChallengeApi.getSimVisualization();
}

// NT4 hooks
export function useNTValue<T>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T) => void] {
  return (window as any).frcChallengeApi.useNTValue(key, defaultValue);
}

export function useNTConnection(): boolean {
  return (window as any).frcChallengeApi.useNTConnection();
}

export function useNTKeys(): string[] {
  return (window as any).frcChallengeApi.useNTKeys();
}

export function useNTKeyExists(key: string): boolean {
  return (window as any).frcChallengeApi.useNTKeyExists(key);
}

// HALSim hooks
export function useHalSimData(): {
  halSimData: HalSimDataMap;
  connected: boolean;
  deviceTypes: string[];
  getDeviceData: (type: string, device: string) => HalSimDeviceData | undefined;
  getAllDevicesOfType: (type: string) => { [deviceId: string]: HalSimDeviceData };
} {
  return (window as any).frcChallengeApi.useHalSimData();
}

export function useDriverStation(): {
  driverStationData: DriverStationPayload;
  currentMode: RobotMode;
  isEnabled: boolean;
  isConnected: boolean;
  setRobotMode: (mode: RobotMode) => void;
  setRobotEnabled: (enabled: boolean) => void;
} {
  return (window as any).frcChallengeApi.useDriverStation();
}
