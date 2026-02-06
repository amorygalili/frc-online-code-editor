export interface Rotation {
  axis: 'x' | 'y' | 'z';
  degrees: number;
}

export type Translation2d = [x: number, y: number];
export type Rotation2d = number; // radians
export type Pose2d = {
  translation: Translation2d;
  rotation: Rotation2d;
};

export type Translation3d = [x: number, y: number, z: number];
export type Rotation3d = Rotation[];
export type Pose3d = {
  translation: Translation3d;
  rotation: Rotation3d;
};

export interface ObjectConfig {
  name: string;
  src: string;
  rotations: Rotation[];
  position: Translation3d;
  components?: {
    name: string;
    src: string;
    rotations: Rotation[];
    position: Translation3d;
  }[];
}


