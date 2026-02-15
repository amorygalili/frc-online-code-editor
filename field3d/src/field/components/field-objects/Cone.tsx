import { useMemo } from 'react';
import { ConeObj } from './types';
import { rotation3dToQuaternion } from '../../../utils';

interface ConeProps {
  object: ConeObj;
}

export default function VisionCone({ object }: ConeProps) {
  const { poses, color, position } = object;
  
  // Default cone parameters
  const coneLength = 2.0; // meters
  const coneAngle = 30; // degrees
  
  const coneRadius = useMemo(() => {
    return coneLength * Math.tan((coneAngle * Math.PI) / 180);
  }, [coneLength, coneAngle]);

  return (
    <>
      {poses.map((pose, index) => {
        const [x, y, z] = pose.translation;
        const quaternion = rotation3dToQuaternion(pose.rotation);

        // Calculate position offset based on position parameter
        let offsetX = 0;
        if (position === 'back') {
          offsetX = -coneLength / 2;
        } else if (position === 'front') {
          offsetX = coneLength / 2;
        }
        // 'center' uses offsetX = 0

        return (
          <group
            key={`cone-${index}`}
            position={[x, y, z]}
            quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
          >
            {/* Vision cone mesh */}
            <mesh
              position={[offsetX + coneLength / 2, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              <coneGeometry args={[coneRadius, coneLength, 16, 1, true]} />
              <meshStandardMaterial
                color={color}
                metalness={0}
                roughness={1}
                transparent={true}
                opacity={0.3}
                side={2} // DoubleSide
              />
            </mesh>
            
            {/* Wireframe outline for better visibility */}
            <mesh
              position={[offsetX + coneLength / 2, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              <coneGeometry args={[coneRadius, coneLength, 16, 1, true]} />
              <meshBasicMaterial
                color={color}
                wireframe={true}
                transparent={true}
                opacity={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

