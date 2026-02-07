import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { rotation3dToQuaternion } from '../utils';
import { convert } from '../units';
import { FieldConfig } from './field-configs';
import { FieldObject } from './components/types';
import FieldObjects from './components/FieldObjects';


// Component to load and display the field model
function FieldModel({
  fieldConfig,
  origin,
  objects = []
}: {
  fieldConfig: FieldConfig;
  origin: 'red' | 'blue';
  objects?: FieldObject[];
}) {
  const { scene } = useGLTF(fieldConfig.src);
  const wpilibCoordinateGroupRef = useRef<Group>(null);
  const wpilibFieldCoordinateGroupRef = useRef<Group>(null);

  // WPILib rotation quaternion
  const WPILIB_ROTATION = useMemo(
    () =>
      rotation3dToQuaternion([
        { axis: 'x', degrees: -90 },
        { axis: 'y', degrees: 180 },
      ]),
    []
  );

  // Field rotation based on config
  const fieldRotation = useMemo(
    () => rotation3dToQuaternion(fieldConfig.rotations),
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

  console.log("OBJECTS:", objects);

  return (
    <>
      {/* WPILib coordinate group - rotated to match WPILib coordinate system */}
      <group ref={wpilibCoordinateGroupRef} quaternion={WPILIB_ROTATION}>
        {/* Field model with its specific rotation */}
        <primitive object={scene} quaternion={fieldRotation} />

        {/* Field coordinate group - origin at driver stations, flipped based on alliance */}
        <group ref={wpilibFieldCoordinateGroupRef}>
          <FieldObjects objects={objects} />
        </group>
      </group>
    </>
  );
}

export default FieldModel;
