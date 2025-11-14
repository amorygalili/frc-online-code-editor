import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Vector3 } from 'three';
import fieldConfigs from './field-configs';
import FieldModel from './FieldModel';
import { FieldObject } from './components/types';

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

// Main Field3d component
export default function Field3d({
  game,
  origin = 'red',
  backgroundColor = 'black',
  style,
  objects = [],
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
        <FieldModel fieldConfig={fieldConfig} origin={origin} objects={objects} />
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
