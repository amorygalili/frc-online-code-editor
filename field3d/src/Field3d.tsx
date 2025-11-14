import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { getQuaternionFromRotSeq } from './utils';
import { convert } from './units';
import fieldConfigs, { FieldConfig } from './field-configs';

interface Field3dProps {
  game?: string;
  origin?: 'red' | 'blue';
  backgroundColor?: string;
  style?: React.CSSProperties;
}

// Component to load and display the field model
function FieldModel({ fieldConfig, origin }: { fieldConfig: FieldConfig; origin: 'red' | 'blue' }) {
  const { scene } = useGLTF(fieldConfig.src);
  const wpilibCoordinateGroupRef = useRef<Group>(null);
  const wpilibFieldCoordinateGroupRef = useRef<Group>(null);

  // WPILib rotation quaternion
  const WPILIB_ROTATION = useMemo(
    () =>
      getQuaternionFromRotSeq([
        { axis: 'x', degrees: -90 },
        { axis: 'y', degrees: 180 },
      ]),
    []
  );

  // Field rotation based on config
  const fieldRotation = useMemo(
    () => getQuaternionFromRotSeq(fieldConfig.rotations),
    [fieldConfig]
  );

  // Adjust materials to remove metalness
  useEffect(() => {
    if (scene) {
      scene.traverse((node) => {
        const mesh = node as Mesh;
        if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
          const material = mesh.material as MeshStandardMaterial;
          material.metalness = 0;
          material.roughness = 1;
        }
      });
    }
  }, [scene]);

  // Update field coordinate group position and rotation based on origin
  useEffect(() => {
    if (wpilibFieldCoordinateGroupRef.current) {
      const isBlue = origin !== 'red';

      // Set rotation
      wpilibFieldCoordinateGroupRef.current.setRotationFromAxisAngle(
        new Vector3(0, 0, 1),
        isBlue ? 0 : Math.PI
      );

      // Set position
      wpilibFieldCoordinateGroupRef.current.position.set(
        convert(fieldConfig.size[0] / 2, fieldConfig.unit, 'm') * (isBlue ? -1 : 1),
        convert(fieldConfig.size[1] / 2, fieldConfig.unit, 'm') * (isBlue ? -1 : 1),
        0
      );
    }
  }, [origin, fieldConfig]);

  return (
    <>
      {/* WPILib coordinate group - rotated to match WPILib coordinate system */}
      <group ref={wpilibCoordinateGroupRef} quaternion={WPILIB_ROTATION}>
        {/* Field model with its specific rotation */}
        <primitive object={scene} quaternion={fieldRotation} />

        {/* Field coordinate group - origin at driver stations, flipped based on alliance */}
        <group ref={wpilibFieldCoordinateGroupRef}>
          {/* This is where field objects would be added */}
        </group>
      </group>
    </>
  );
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

// Main Field3d component
export default function Field3d({
  game,
  origin = 'red',
  backgroundColor = 'black',
  style,
}: Field3dProps) {
  // Get field config based on game prop
  const fieldConfig = useMemo(() => {
    const config = game
      ? fieldConfigs.find((config) => config.game === game)
      : fieldConfigs[0];
    return config ?? fieldConfigs[0];
  }, [game]);

  // Default camera position and target
  const ORBIT_FIELD_DEFAULT_POSITION = new Vector3(0, 6, -12);
  const ORBIT_FIELD_DEFAULT_TARGET = new Vector3(0, 0.5, 0);

  return (
    <div style={{ width: '700px', height: '400px', ...style }}>
      <Canvas
        camera={{
          position: ORBIT_FIELD_DEFAULT_POSITION,
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
        style={{ background: backgroundColor }}
      >
        <Lights />
        <FieldModel fieldConfig={fieldConfig} origin={origin} />
        <OrbitControls
          target={ORBIT_FIELD_DEFAULT_TARGET}
          maxDistance={30}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}

// Preload field models
fieldConfigs.forEach((config) => {
  useGLTF.preload(config.src);
});
