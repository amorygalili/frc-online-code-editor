import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { TrajectoryObj } from './types';
import { Color, Vector3 } from 'three';

type TrajectoryProps = Omit<TrajectoryObj, 'type'>;

export default function Trajectory({ poses, color, size }: TrajectoryProps) {
  // Convert poses to points for the line
  const points = useMemo(() => {
    return poses.map((pose) => new Vector3(...pose.translation));
  }, [poses]);

  // Determine line width based on size
  const lineWidth = useMemo(() => {
    switch (size) {
      case 'small':
        return 2;
      case 'medium':
        return 4;
      case 'large':
        return 6;
      default:
        return 3;
    }
  }, [size]);

  if (points.length < 2) {
    return null; // Need at least 2 points for a line
  }

  return (
    <>
      <Line
        points={points}
        color={new Color(color).getHex()}
        lineWidth={lineWidth}
        dashed={false}
      />

      {/* Add small spheres at each pose for better visibility */}
      {poses.map((pose, index) => {
        const [x, y, z] = pose.translation;
        return (
          <mesh key={`trajectory-point-${index}`} position={[x, y, z]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial
              color={color}
              metalness={0}
              roughness={1}
            />
          </mesh>
        );
      })}
    </>
  );
}

