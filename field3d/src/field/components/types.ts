import { Pose3d } from '../field-interfaces';

// Base types for 3D components based on AdvantageScope Field3dRenderer types

export type AprilTagVariant =
  | 'frc-36h11'
  | 'frc-16h5'
  | 'ftc-2in'
  | 'ftc-3in'
  | 'ftc-4in'
  | 'ftc-5in';

// Generic robot object (shared by robot and ghost)
export interface GenericRobotObj {
  model: string;
  poses: Pose3d[];
  components: Pose3d[]; // Articulated component poses
  visionTargets?: Pose3d[]; // Vision target poses
}

export interface RobotObj extends GenericRobotObj {
  type: 'robot';
}

export interface GhostObj extends GenericRobotObj {
  type: 'ghost';
  color: string;
}

export interface GamePieceObj {
  type: 'gamePiece';
  variant: string; // e.g., 'note', 'cone', 'cube'
  poses: Pose3d[];
}

export interface TrajectoryObj {
  type: 'trajectory';
  color: string;
  size: string; // 'small', 'medium', 'large'
  poses: Pose3d[];
}

export interface HeatmapObj {
  type: 'heatmap';
  poses: Pose3d[];
}

export interface AprilTagObj {
  type: 'aprilTag';
  poses: Pose3d[];
  variant: AprilTagVariant;
}

export interface AprilTagBuiltInObj {
  type: 'aprilTagBuiltIn';
  poses: Pose3d[];
  variant: AprilTagVariant;
}

export interface AxesObj {
  type: 'axes';
  poses: Pose3d[];
}

export interface ConeObj {
  type: 'cone';
  color: string;
  position: 'center' | 'back' | 'front';
  poses: Pose3d[];
}

export type FieldObject =
  | RobotObj
  | GhostObj
  | GamePieceObj
  | TrajectoryObj
  | HeatmapObj
  | AprilTagObj
  | AprilTagBuiltInObj
  | AxesObj
  | ConeObj;

