import { Object3D, Quaternion, Vector3 } from 'three';
import {
  Pose3d,
  Rotation3d,
  Translation3d,
} from './field/field-interfaces';

// https://github.com/Mechanical-Advantage/AdvantageScope/blob/main/src/shared/visualizers/ThreeDimensionVisualizer.ts#L909
export function rotation3dToQuaternion(rotations: Rotation3d): Quaternion {
  const quaternion = new Quaternion();
  rotations.forEach((rotation) => {
    const axis = new Vector3(0, 0, 0);
    if (rotation.axis === 'x') axis.setX(1);
    if (rotation.axis === 'y') axis.setY(1);
    if (rotation.axis === 'z') axis.setZ(1);
    const radians = (rotation.degrees * Math.PI) / 180;
    quaternion.premultiply(new Quaternion().setFromAxisAngle(axis, radians));
  });
  return quaternion;
}

export function getPose3d(pose: number[]): Pose3d {
  // Rotation2d: [x, y, yaw]
  if (pose.length === 3) {
    const [x, y, yaw] = pose;
    return {
      translation: [x, y, 0],
      rotation: [{ axis: 'z', degrees: yaw }],
    };
    // [x, y, z, yaw]
  } else if (pose.length === 4) {
    const [x, y, z, yaw] = pose;
    return {
      translation: [x, y, z],
      rotation: [{ axis: 'z', degrees: yaw }],
    };
  } else if (pose.length === 6) {
    const [x, y, z, roll, pitch, yaw] = pose;
    return {
      translation: [x, y, z],
      rotation: [
        { axis: 'x', degrees: roll },
        { axis: 'y', degrees: pitch },
        { axis: 'z', degrees: yaw },
      ],
    };
  } else if (pose.length === 7) {
    // Convert quaternion [x, y, z, w, x, y, z] to Rotation[]
    // For now, we'll convert to zero rotation as we can't easily convert quaternion to axis-angle sequence
    const translation = pose.slice(0, 3) as Translation3d;
    return { translation, rotation: [] };
  }
  return getZeroPose3d();
}

export function getZeroPose3d(): Pose3d {
  return {
    translation: [0, 0, 0],
    rotation: [],
  };
}

export function updatePose(object: Object3D, pose: Pose3d): void {
  const [x, y, z] = pose.translation;
  object.position.set(x, y, z);
  object.rotation.setFromQuaternion(rotation3dToQuaternion(pose.rotation));
}
