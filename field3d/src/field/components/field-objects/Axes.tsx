import { AxesObj } from './types';
import { rotation3dToQuaternion } from '../../../utils';

type AxesProps = Omit<AxesObj, 'type'> & {
  // Size of axes in meters, default 0.5
  size?: number
};

// Single axis arrow
function AxisArrow({
  color,
  length,
  rotation
}: {
  color: string;
  length: number;
  rotation?: [number, number, number];
}) {
  const shaftRadius = length * 0.02;
  const coneRadius = length * 0.04;
  const coneHeight = length * 0.15;
  const shaftLength = length - coneHeight;

  return (
    <group rotation={rotation}>
      {/* Shaft */}
      <mesh position={[shaftLength / 2, 0, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLength, 8]} />
        <meshStandardMaterial
          color={color}
          metalness={0}
          roughness={1}
        />
      </mesh>

      {/* Cone tip */}
      <mesh position={[shaftLength + coneHeight / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[coneRadius, coneHeight, 8]} />
        <meshStandardMaterial
          color={color}
          metalness={0}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

export default function Axes({ poses, size = 0.5 }: AxesProps) {

  return (
    <>
      {poses.map((pose, index) => {
        const [x, y, z] = pose.translation;
        const quaternion = rotation3dToQuaternion(pose.rotation);

        return (
          <group
            key={`axes-${index}`}
            position={[x, y, z]}
            quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
          >
            {/* X axis - Red */}
            <AxisArrow color="#ff0000" length={size} />

            {/* Y axis - Green */}
            <AxisArrow color="#00ff00" length={size} rotation={[0, 0, Math.PI / 2]} />

            {/* Z axis - Blue */}
            <AxisArrow color="#0000ff" length={size} rotation={[0, -Math.PI / 2, 0]} />
          </group>
        );
      })}
    </>
  );
}

