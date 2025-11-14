import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { RobotObj, GhostObj } from './types';
import { rotation3dToQuaternion } from '../../utils';

interface RobotProps {
  object: RobotObj | GhostObj;
}

// Default robot model - simple box if no model specified
function DefaultRobotModel({ color, opacity }: { color?: string; opacity?: number }) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[0.7, 0.5, 0.7]} />
      <meshStandardMaterial
        color={color || '#2196f3'}
        metalness={0}
        roughness={1}
        transparent={opacity !== undefined && opacity < 1}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
}

// Adjust materials to match AdvantageScope rendering
function adjustMaterials(group: Group, color?: string, opacity?: number): void {
  group.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
      const material = mesh.material as MeshStandardMaterial;
      material.metalness = 0;
      material.roughness = 1;
      if (color) {
        material.color.set(color);
      }
      if (opacity !== undefined && opacity < 1) {
        material.transparent = true;
        material.opacity = opacity;
      }
    }
  });
}

// Robot model loader
function RobotModel({
  modelPath,
  color,
  opacity
}: {
  modelPath?: string;
  color?: string;
  opacity?: number;
}) {
  const model = modelPath ? useGLTF(modelPath) : null;

  useMemo(() => {
    if (model?.scene) {
      adjustMaterials(model.scene as Group, color, opacity);
    }
  }, [model, color, opacity]);

  if (!model || !model.scene) {
    return <DefaultRobotModel color={color} opacity={opacity} />;
  }

  return <primitive object={model.scene.clone()} />;
}

export default function Robot({ object }: RobotProps) {
  const { poses, model, components, visionTargets } = object;
  const color = object.type === 'ghost' ? object.color : undefined;
  const opacity = object.type === 'ghost' ? 0.5 : 1.0;

  return (
    <>
      {poses.map((pose, index) => {
        const [x, y, z] = pose.translation;
        const quaternion = rotation3dToQuaternion(pose.rotation);

        return (
          <group
            key={`robot-${index}`}
            position={[x, y, z]}
            quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
          >
            <RobotModel modelPath={model} color={color} opacity={opacity} />

            {/* Render articulated components if provided */}
            {components && components.map((compPose, compIndex) => {
              const [cx, cy, cz] = compPose.translation;
              const cQuaternion = rotation3dToQuaternion(compPose.rotation);

              return (
                <group
                  key={`component-${compIndex}`}
                  position={[cx, cy, cz]}
                  quaternion={[cQuaternion.x, cQuaternion.y, cQuaternion.z, cQuaternion.w]}
                >
                  {/* Simple box for component - could be enhanced with actual component models */}
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.2, 0.2, 0.2]} />
                    <meshStandardMaterial
                      color={color || '#4caf50'}
                      metalness={0}
                      roughness={1}
                      transparent={opacity < 1}
                      opacity={opacity}
                    />
                  </mesh>
                </group>
              );
            })}

            {/* Render vision targets if provided */}
            {visionTargets && visionTargets.map((targetPose, targetIndex) => {
              const [tx, ty, tz] = targetPose.translation;
              const tQuaternion = rotation3dToQuaternion(targetPose.rotation);

              return (
                <group
                  key={`vision-target-${targetIndex}`}
                  position={[tx, ty, tz]}
                  quaternion={[tQuaternion.x, tQuaternion.y, tQuaternion.z, tQuaternion.w]}
                >
                  {/* Small sphere for vision target */}
                  <mesh>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshStandardMaterial
                      color="#ff0000"
                      metalness={0}
                      roughness={1}
                      emissive="#ff0000"
                      emissiveIntensity={0.5}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

