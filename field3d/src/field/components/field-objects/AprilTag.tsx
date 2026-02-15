import { useMemo } from 'react';
import { AprilTagObj, AprilTagBuiltInObj, AprilTagVariant } from './types';
import { rotation3dToQuaternion } from '../../../utils';

interface AprilTagProps {
  object: AprilTagObj | AprilTagBuiltInObj;
}

// Get tag size based on variant
function getTagSize(variant: AprilTagVariant): number {
  switch (variant) {
    case 'frc-36h11':
      return 0.1651; // 6.5 inches in meters
    case 'frc-16h5':
      return 0.1524; // 6 inches in meters
    case 'ftc-2in':
      return 0.0508; // 2 inches in meters
    case 'ftc-3in':
      return 0.0762; // 3 inches in meters
    case 'ftc-4in':
      return 0.1016; // 4 inches in meters
    case 'ftc-5in':
      return 0.127; // 5 inches in meters
    default:
      return 0.1651;
  }
}

export default function AprilTag({ object }: AprilTagProps) {
  const { poses, variant } = object;
  
  const tagSize = useMemo(() => getTagSize(variant), [variant]);
  const borderSize = tagSize * 1.25; // White border around tag

  return (
    <>
      {poses.map((pose, index) => {
        const [x, y, z] = pose.translation;
        const quaternion = rotation3dToQuaternion(pose.rotation);

        return (
          <group
            key={`apriltag-${index}`}
            position={[x, y, z]}
            quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
          >
            {/* White border */}
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[borderSize, borderSize]} />
              <meshStandardMaterial
                color="#ffffff"
                metalness={0}
                roughness={1}
                side={2} // DoubleSide
              />
            </mesh>
            
            {/* Black tag */}
            <mesh>
              <planeGeometry args={[tagSize, tagSize]} />
              <meshStandardMaterial
                color="#000000"
                metalness={0}
                roughness={1}
                side={2} // DoubleSide
              />
            </mesh>
            
            {/* White pattern (simplified - just a few squares) */}
            {/* In a full implementation, this would render the actual AprilTag pattern */}
            <mesh position={[-tagSize * 0.25, tagSize * 0.25, 0.001]}>
              <planeGeometry args={[tagSize * 0.2, tagSize * 0.2]} />
              <meshStandardMaterial
                color="#ffffff"
                metalness={0}
                roughness={1}
                side={2}
              />
            </mesh>
            <mesh position={[tagSize * 0.25, -tagSize * 0.25, 0.001]}>
              <planeGeometry args={[tagSize * 0.2, tagSize * 0.2]} />
              <meshStandardMaterial
                color="#ffffff"
                metalness={0}
                roughness={1}
                side={2}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

