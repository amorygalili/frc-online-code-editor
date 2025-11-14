import { Rotation, Pose3d } from '../field-interfaces';
import { getRotation3dFromRotSeq } from '../../utils';
import { RobotObj } from './types';

export interface RobotConfigComponent {
  name?: string;
  src?: string;
  zeroedRotations: Rotation[];
  zeroedPosition: [number, number, number];
}

export interface RobotConfigCamera {
  name: string;
  rotations: Rotation[];
  position: [number, number, number];
  resolution: [number, number];
  fov: number;
}

export interface RobotConfig {
  name: string;
  rotations: Rotation[];
  position: [number, number, number];
  cameras?: RobotConfigCamera[];
  components?: RobotConfigComponent[];
}

/**
 * Load and parse a robot config.json file
 * @param configPath - Path to the robot config.json file (e.g., '/3d-models/Robot_BananaSplitV4/config.json')
 * @returns Promise that resolves to the parsed robot config or null if not found
 */
export async function loadRobotConfig(configPath: string): Promise<RobotConfig | null> {
  try {
    const response = await fetch(configPath);
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    const data: RobotConfig = await response.json();
    return data;
  } catch (error) {
    console.warn(`Could not load robot config from ${configPath}:`, error);
    return null;
  }
}

/**
 * Convert robot config component to Pose3d for rendering
 * @param component - Robot config component
 * @returns Pose3d for the component
 */
export function componentToPose3d(component: RobotConfigComponent): Pose3d {
  return {
    translation: component.zeroedPosition,
    rotation: getRotation3dFromRotSeq(component.zeroedRotations),
  };
}

/**
 * Convert robot config camera to Pose3d for rendering as vision target
 * @param camera - Robot config camera
 * @returns Pose3d for the camera
 */
export function cameraToPose3d(camera: RobotConfigCamera): Pose3d {
  return {
    translation: camera.position,
    rotation: getRotation3dFromRotSeq(camera.rotations),
  };
}

/**
 * Get the base pose for the robot from its config
 * @param config - Robot config
 * @returns Pose3d for the robot base
 */
export function getBasePose(config: RobotConfig): Pose3d {
  return {
    translation: config.position,
    rotation: getRotation3dFromRotSeq(config.rotations),
  };
}

/**
 * Create a RobotObj from a config path and robot config
 * @param configPath - Path to the robot config.json file
 * @param config - Robot config (if null, creates a basic robot without components)
 * @param pose - Robot pose on the field
 * @returns RobotObj with components and vision targets from config
 */
export function createRobotFromConfig(
  configPath: string,
  config: RobotConfig | null,
  pose: Pose3d
): RobotObj {
  // Extract the directory path and construct model.glb path
  const lastSlashIndex = configPath.lastIndexOf('/');
  const modelDir = lastSlashIndex !== -1 ? configPath.substring(0, lastSlashIndex) : '';
  const modelPath = `${modelDir}/model.glb`;

  const robot: RobotObj = {
    type: 'robot',
    model: modelPath,
    poses: [pose],
    components: [],
    visionTargets: [],
  };

  if (!config) {
    return robot;
  }

  // Add components from config
  if (config.components) {
    robot.components = config.components.map(componentToPose3d);
  }

  // Add vision targets from cameras
  if (config.cameras) {
    robot.visionTargets = config.cameras.map(cameraToPose3d);
  }

  return robot;
}

/**
 * Load a robot config and create a RobotObj
 * @param configPath - Path to the robot config.json file (e.g., '/3d-models/Robot_BananaSplitV4/config.json')
 * @param pose - Robot pose on the field
 * @returns Promise that resolves to a RobotObj with config loaded
 */
export async function loadRobotFromConfig(
  configPath: string,
  pose: Pose3d
): Promise<RobotObj> {
  const config = await loadRobotConfig(configPath);
  return createRobotFromConfig(configPath, config, pose);
}

