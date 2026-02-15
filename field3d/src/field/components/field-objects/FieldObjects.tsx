import { FieldObject } from './types';
import Robot from './Robot';
import GamePiece from './GamePiece';
import Trajectory from './Trajectory';
import Axes from './Axes';
import AprilTag from './AprilTag';
import VisionCone from './Cone';

interface FieldObjectsProps {
  objects: FieldObject[];
}

export default function FieldObjects({ objects }: FieldObjectsProps) {
  return (
    <>
      {objects.map((object, index) => {
        const key = `${object.type}-${index}`;
        
        switch (object.type) {
          case 'robot':
            return <Robot key={key} {...object} />;
          
          case 'gamePiece':
            return <GamePiece key={key} {...object} />;
          
          case 'trajectory':
            return <Trajectory key={key} {...object} />;
          
          case 'axes':
            return <Axes key={key} {...object} />;
          
          case 'aprilTag':
          case 'aprilTagBuiltIn':
            return <AprilTag key={key} {...object} />;
          
          case 'cone':
            return <VisionCone key={key} {...object} />;
          
          case 'heatmap':
            // Heatmap would require more complex implementation
            // For now, just render as points
            return (
              <group key={key}>
                {object.poses.map((pose, poseIndex) => {
                  const [x, y, z] = pose.translation;
                  return (
                    <mesh key={`heatmap-point-${poseIndex}`} position={[x, y, z]}>
                      <sphereGeometry args={[0.05, 8, 8]} />
                      <meshStandardMaterial
                        color="#ff0000"
                        metalness={0}
                        roughness={1}
                        transparent={true}
                        opacity={0.5}
                      />
                    </mesh>
                  );
                })}
              </group>
            );
          
          default:
            return null;
        }
      })}
    </>
  );
}

