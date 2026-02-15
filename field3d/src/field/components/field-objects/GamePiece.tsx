import { GamePieceObj } from './types';
import { rotation3dToQuaternion } from '../../../utils';

type GamePieceProps = Omit<GamePieceObj, 'type'>;

// Default game piece models based on variant
function DefaultGamePiece({ variant }: { variant: string }) {
  // Common game piece geometries
  switch (variant.toLowerCase()) {
    case 'note': // 2024 Crescendo
      return (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 32]} />
          <meshStandardMaterial
            color="#ff6600"
            metalness={0}
            roughness={0.8}
          />
        </mesh>
      );
    
    case 'cone': // 2023 Charged Up
      return (
        <mesh castShadow receiveShadow>
          <coneGeometry args={[0.15, 0.33, 16]} />
          <meshStandardMaterial
            color="#ffff00"
            metalness={0}
            roughness={0.8}
          />
        </mesh>
      );
    
    case 'cube': // 2023 Charged Up
      return (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial
            color="#9900ff"
            metalness={0}
            roughness={0.8}
          />
        </mesh>
      );
    
    case 'cargo': // 2022 Rapid React
      return (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshStandardMaterial
            color="#0033ff"
            metalness={0}
            roughness={0.8}
          />
        </mesh>
      );
    
    case 'power cell': // 2021 Infinite Recharge
      return (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.09, 32, 32]} />
          <meshStandardMaterial
            color="#ffff00"
            metalness={0}
            roughness={0.8}
          />
        </mesh>
      );
    
    default:
      // Generic game piece
      return (
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.1, 32, 32]} />
          <meshStandardMaterial
            color="#00ff00"
            metalness={0}
            roughness={0.8}
          />
        </mesh>
      );
  }
}

export default function GamePiece({ variant, poses }: GamePieceProps) {
  return (
    <>
      {poses.map((pose, index) => {
        const [x, y, z] = pose.translation;
        const quaternion = rotation3dToQuaternion(pose.rotation);

        return (
          <group
            key={`gamepiece-${index}`}
            position={[x, y, z]}
            quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}
          >
            <DefaultGamePiece variant={variant} />
          </group>
        );
      })}
    </>
  );
}

