import React, { useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import fieldConfigs from '../field-configs';
import FieldModel from './FieldModel';
import { FieldObject } from './field-objects/types';
import { rotation3dToQuaternion } from '../../utils';
import { convert } from '../../units';
import CameraController, { resolveCamera, ResolvedCamera } from './CameraController';
import type { RobotConfigCamera } from '../robotConfigLoader';
import { Rotation } from '../field-interfaces';

interface Field3dProps {
  game?: string;
  origin?: 'red' | 'blue';
  backgroundColor?: string;
  style?: React.CSSProperties;
  objects?: FieldObject[];
}


// Lights component
function Lights() {
  return (
    <>
      <pointLight position={[0, 10, 0]} intensity={0.2} color={0xffffff} />
      <hemisphereLight
        args={[0xffffff, 0x444444, 1]}
        position={[0, 1, 0]}
      />
    </>
  );
}

/** Collect all cameras from robot/ghost objects, paired with their parent robot's first pose. */
function collectCameras(objects: FieldObject[]): { camera: RobotConfigCamera; robotTranslation: [number, number, number]; robotRotation: Rotation[] }[] {
  const result: { camera: RobotConfigCamera; robotTranslation: [number, number, number]; robotRotation: Rotation[] }[] = [];
  for (const obj of objects) {
    if ((obj.type === 'robot' || obj.type === 'ghost') && obj.cameras && obj.cameras.length > 0 && obj.poses.length > 0) {
      const pose = obj.poses[0];
      for (const cam of obj.cameras) {
        result.push({
          camera: cam,
          robotTranslation: pose.translation,
          robotRotation: pose.rotation,
        });
      }
    }
  }
  return result;
}

// Main Field3d component
export default function Field3d({
  game,
  origin = 'red',
  backgroundColor = 'black',
  style,
  objects = [],
}: Field3dProps) {
  const orbitControlsRef = useRef<OrbitControlsImpl | null>(null);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(-1); // -1 = orbit

  // Get field config based on game prop
  const fieldConfig = useMemo(() => {
    const config = game
      ? fieldConfigs.find((config) => config.game === game)
      : fieldConfigs[0];
    return config ?? fieldConfigs[0];
  }, [game]);

  // Default camera position and target
  const ORBIT_FIELD_DEFAULT_POSITION = useMemo(() => new Vector3(0, 6, -12), []);
  const ORBIT_FIELD_DEFAULT_TARGET = useMemo(() => new Vector3(0, 0.5, 0), []);
  const DEFAULT_FOV = 50;

  // WPILib rotation (same as FieldModel)
  const wpilibRotation = useMemo(
    () => rotation3dToQuaternion([
      { axis: 'x', degrees: -90 },
      { axis: 'y', degrees: 180 },
    ]),
    []
  );

  // Field origin offset and rotation (same logic as FieldModel)
  const { fieldOffset, fieldOriginRotation } = useMemo(() => {
    const isBlue = origin !== 'red';
    const offset = new Vector3(
      convert(fieldConfig.size[0] / 2, fieldConfig.unit, 'm') * (isBlue ? -1 : 1),
      convert(fieldConfig.size[1] / 2, fieldConfig.unit, 'm') * (isBlue ? -1 : 1),
      0,
    );
    const rotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 0, 1),
      isBlue ? 0 : Math.PI,
    );
    return { fieldOffset: offset, fieldOriginRotation: rotation };
  }, [origin, fieldConfig]);

  // Collect cameras from objects
  const cameraEntries = useMemo(() => collectCameras(objects), [objects]);

  // Resolve the selected camera to world space
  const activeCamera: ResolvedCamera | null = useMemo(() => {
    if (selectedCameraIndex < 0 || selectedCameraIndex >= cameraEntries.length) return null;
    const entry = cameraEntries[selectedCameraIndex];
    const { position, quaternion } = resolveCamera(
      entry.camera.position,
      entry.camera.rotations,
      entry.robotTranslation,
      entry.robotRotation,
      fieldOffset,
      fieldOriginRotation,
      wpilibRotation,
    );
    return {
      name: entry.camera.name,
      fov: entry.camera.fov,
      worldPosition: position,
      worldQuaternion: quaternion,
    };
  }, [selectedCameraIndex, cameraEntries, fieldOffset, fieldOriginRotation, wpilibRotation]);

  // Reset selection if cameras disappear
  const prevCameraCount = useRef(cameraEntries.length);
  if (cameraEntries.length !== prevCameraCount.current) {
    prevCameraCount.current = cameraEntries.length;
    if (selectedCameraIndex >= cameraEntries.length) {
      setSelectedCameraIndex(-1);
    }
  }

  return (
    <div style={{ width: '700px', height: '400px', ...style, position: 'relative' }}>
      {/* Camera selector overlay */}
      {cameraEntries.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.6)',
          borderRadius: 4,
          padding: '4px 8px',
        }}>
          <select
            value={selectedCameraIndex}
            onChange={(e) => setSelectedCameraIndex(Number(e.target.value))}
            style={{
              background: 'rgba(30, 30, 30, 0.9)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value={-1}>Orbit</option>
            {cameraEntries.map((entry, i) => (
              <option key={i} value={i}>{entry.camera.name}</option>
            ))}
          </select>
        </div>
      )}

      <Canvas
        camera={{
          position: ORBIT_FIELD_DEFAULT_POSITION,
          fov: DEFAULT_FOV,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
        style={{ background: backgroundColor }}
      >
        <Lights />
        <FieldModel fieldConfig={fieldConfig} origin={origin} objects={objects} />
        <OrbitControls
          ref={orbitControlsRef}
          target={ORBIT_FIELD_DEFAULT_TARGET}
          maxDistance={30}
          enableDamping={true}
          dampingFactor={0.05}
        />
        <CameraController
          activeCamera={activeCamera}
          orbitControlsRef={orbitControlsRef}
          defaultPosition={ORBIT_FIELD_DEFAULT_POSITION}
          defaultTarget={ORBIT_FIELD_DEFAULT_TARGET}
          defaultFov={DEFAULT_FOV}
        />
      </Canvas>
    </div>
  );
}

// Preload field models
fieldConfigs.forEach((config) => {
  useGLTF.preload(config.src);
});
