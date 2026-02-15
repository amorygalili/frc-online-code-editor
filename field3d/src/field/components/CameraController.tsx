import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Quaternion, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { rotation3dToQuaternion } from '../../utils';
import { Rotation } from '../field-interfaces';

export interface ResolvedCamera {
  name: string;
  fov: number;
  /** Camera position in WPILib field coordinates (already combined: robot pose + camera local offset) */
  worldPosition: Vector3;
  /** Camera orientation in WPILib field coordinates */
  worldQuaternion: Quaternion;
}

/**
 * Compute the world-space position and orientation of a robot-mounted camera.
 *
 * Transform chain (same as the scene graph in FieldModel):
 *   WPILib rotation → field coordinate offset/rotation → robot pose → camera local pose
 *
 * We replicate this here so we can set the Three.js camera directly.
 */
export function resolveCamera(
  cameraPosition: [number, number, number],
  cameraRotations: Rotation[],
  robotTranslation: [number, number, number],
  robotRotation: Rotation[],
  fieldOffset: Vector3,
  fieldOriginRotation: Quaternion,
  wpilibRotation: Quaternion,
): { position: Vector3; quaternion: Quaternion } {
  // Camera local
  const camLocalPos = new Vector3(...cameraPosition);
  const camLocalQuat = rotation3dToQuaternion(cameraRotations);

  // Robot pose
  const robotPos = new Vector3(...robotTranslation);
  const robotQuat = rotation3dToQuaternion(robotRotation);

  // Camera in robot space → field object space
  const pos = camLocalPos.clone().applyQuaternion(robotQuat).add(robotPos);
  const quat = robotQuat.clone().multiply(camLocalQuat);

  // Field object space → WPILib coordinate space (apply field offset + origin rotation)
  pos.applyQuaternion(fieldOriginRotation).add(fieldOffset);
  quat.premultiply(fieldOriginRotation);

  // WPILib coordinate space → Three.js world space
  pos.applyQuaternion(wpilibRotation);
  quat.premultiply(wpilibRotation);

  return { position: pos, quaternion: quat };
}

interface CameraControllerProps {
  /** null means orbit (default) */
  activeCamera: ResolvedCamera | null;
  orbitControlsRef: React.RefObject<OrbitControlsImpl | null>;
  defaultPosition: Vector3;
  defaultTarget: Vector3;
  defaultFov: number;
}

/**
 * Component that lives inside the R3F Canvas and imperatively controls the camera
 * when a fixed robot camera is selected.
 */
export default function CameraController({
  activeCamera,
  orbitControlsRef,
  defaultPosition,
  defaultTarget,
  defaultFov,
}: CameraControllerProps) {
  const { camera } = useThree();
  const wasFixedRef = useRef(false);

  useEffect(() => {
    const controls = orbitControlsRef.current;

    if (activeCamera) {
      // Disable orbit controls
      if (controls) controls.enabled = false;

      // Set camera to the fixed view
      camera.position.copy(activeCamera.worldPosition);
      camera.quaternion.copy(activeCamera.worldQuaternion);
      if ('fov' in camera) {
        (camera as any).fov = activeCamera.fov;
        (camera as any).updateProjectionMatrix();
      }
      wasFixedRef.current = true;
    } else if (wasFixedRef.current) {
      // Restore orbit controls
      if (controls) {
        controls.enabled = true;
        // Reset to default orbit position
        camera.position.copy(defaultPosition);
        if ('fov' in camera) {
          (camera as any).fov = defaultFov;
          (camera as any).updateProjectionMatrix();
        }
        controls.target.copy(defaultTarget);
        controls.update();
      }
      wasFixedRef.current = false;
    }
  }, [activeCamera, camera, orbitControlsRef, defaultPosition, defaultTarget, defaultFov]);

  return null;
}

