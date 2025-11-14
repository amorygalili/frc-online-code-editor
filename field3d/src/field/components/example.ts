/**
 * Example usage of 3D field components
 *
 * This file demonstrates how to create and use the various field objects
 * based on the AdvantageScope Field3dRenderer API.
 */

import { FieldObject } from './types';
import { loadRobotFromConfig } from './robotConfigLoader';

// Example: Load robot with config.json (recommended approach)
// This will automatically load components and cameras from the config file
export async function createExampleRobotWithConfig(): Promise<FieldObject> {
  return await loadRobotFromConfig(
    '/3d-models/Robot_BananaSplitV4/config.json',
    {
      translation: [2.0, 0.0, 0.0],
      rotation: [1, 0, 0, 0],
    }
  );
}

// Example: Robot with manually specified components (alternative approach)
export const exampleRobot: FieldObject = {
  type: 'robot',
  model: '/models/robot.glb', // Path to robot GLB model
  poses: [
    {
      translation: [2.0, 0.0, 0.5], // x, y, z in meters
      rotation: [1, 0, 0, 0], // [w, x, y, z] quaternion
    },
  ],
  components: [], // Articulated components (e.g., arm, elevator)
  visionTargets: [], // Vision target poses
};

// Example: Ghost robot (semi-transparent)
export const exampleGhost: FieldObject = {
  type: 'ghost',
  model: '/models/robot.glb',
  color: '#00ff00', // Green ghost
  poses: [
    {
      translation: [3.0, 0.0, 0.5],
      rotation: [1, 0, 0, 0],
    },
  ],
  components: [],
  visionTargets: [],
};

// Example: Game pieces (2024 Crescendo Notes)
export const exampleGamePieces: FieldObject = {
  type: 'gamePiece',
  variant: 'note', // 'note', 'cone', 'cube', 'cargo', etc.
  poses: [
    {
      translation: [1.0, 1.0, 0.1],
      rotation: [1, 0, 0, 0],
    },
    {
      translation: [1.0, -1.0, 0.1],
      rotation: [1, 0, 0, 0],
    },
  ],
};

// Example: Trajectory (robot path)
export const exampleTrajectory: FieldObject = {
  type: 'trajectory',
  color: '#ff0000', // Red trajectory
  size: 'medium', // 'small', 'medium', 'large'
  poses: [
    {
      translation: [0.0, 0.0, 0.0],
      rotation: [1, 0, 0, 0],
    },
    {
      translation: [1.0, 0.5, 0.0],
      rotation: [1, 0, 0, 0],
    },
    {
      translation: [2.0, 1.0, 0.0],
      rotation: [1, 0, 0, 0],
    },
    {
      translation: [3.0, 1.0, 0.0],
      rotation: [1, 0, 0, 0],
    },
  ],
};

// Example: AprilTags
export const exampleAprilTags: FieldObject = {
  type: 'aprilTag',
  variant: 'frc-36h11', // FRC 2024 AprilTag family
  poses: [
    {
      translation: [0.0, 2.0, 1.0], // On a wall
      rotation: [0.707, 0, 0.707, 0], // [w, x, y, z] - Rotated 90 degrees
    },
  ],
};

// Example: Coordinate axes
export const exampleAxes: FieldObject = {
  type: 'axes',
  poses: [
    {
      translation: [0.0, 0.0, 0.0], // Origin
      rotation: [1, 0, 0, 0],
    },
  ],
};

// Example: Vision cone
export const exampleVisionCone: FieldObject = {
  type: 'cone',
  color: '#ffff00', // Yellow cone
  position: 'front', // 'center', 'back', 'front'
  poses: [
    {
      translation: [2.0, 0.0, 0.5],
      rotation: [1, 0, 0, 0],
    },
  ],
};

// Example: Complete field with multiple objects
export const exampleFieldObjects: FieldObject[] = [
  exampleRobot,
  exampleGhost,
  exampleGamePieces,
  exampleTrajectory,
  exampleAprilTags,
  exampleAxes,
  exampleVisionCone,
];

/**
 * Usage in a React component:
 * 
 * import Field3d from './field/Field3d';
 * import { exampleFieldObjects } from './field/components/example';
 * 
 * function MyComponent() {
 *   return (
 *     <Field3d
 *       game="2024-crescendo"
 *       origin="blue"
 *       objects={exampleFieldObjects}
 *     />
 *   );
 * }
 */

