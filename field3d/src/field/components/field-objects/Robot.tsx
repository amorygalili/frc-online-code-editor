import { useEffect, useMemo, useState } from 'react';
import { Euler, LoadingManager, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { GLTFLoader } from 'three-stdlib';
import URDFLoader from 'urdf-loader';
import { URDFRobot as URDFRobotModel } from 'urdf-loader';
import { RobotObj, GhostObj } from './types';
import { RobotConfigComponent, RobotConfigJoint, getValidJointIndices } from '../../robotConfigLoader';
import { rotation3dToQuaternion } from '../../../utils';
import { Rotation } from '../../field-interfaces';

interface RobotProps {
  object: RobotObj | GhostObj;
}

/**
 * Convert an array of axis-angle Rotation[] to URDF roll-pitch-yaw (RPY) string.
 * Composes all rotations into a quaternion, then extracts Euler angles in ZYX
 * intrinsic order — matching the URDF convention used by urdf-loader's
 * `applyRotation`, which interprets RPY with Euler order 'ZYX'.
 */
function rotationsToRPY(rotations: Rotation[]): string {
  const q = rotation3dToQuaternion(rotations);
  const euler = new Euler().setFromQuaternion(q, 'ZYX');
  return `${euler.x} ${euler.y} ${euler.z}`;
}

/**
 * Build a URDF XML string from robot config.
 *
 * Naming convention:
 * - "model" — the base link, visual mesh is model.glb, visual origin from config rotations/position
 * - "model_0", "model_1", … — one link per component, visual mesh is model_N.glb,
 *   visual origin from the component's zeroedRotations/zeroedPosition
 *
 * Joint parent/child are indices into the components array.
 * If parent is undefined, the parent is the base "model" link.
 */
function buildURDFXml(
  components: RobotConfigComponent[],
  joints: RobotConfigJoint[],
  modelDir: string,
  modelRotations: Rotation[],
  modelPosition: [number, number, number],
): string {
  // Base link: "model" with model.glb
  const baseRpy = rotationsToRPY(modelRotations);
  const [bx, by, bz] = modelPosition;
  let linksXml = `
  <link name="model">
    <visual>
      <origin xyz="${bx} ${by} ${bz}" rpy="${baseRpy}"/>
      <geometry>
        <mesh filename="${modelDir}/model.glb"/>
      </geometry>
    </visual>
  </link>`;

  // Component links: "model_N" with model_N.glb
  components.forEach((comp, i) => {
    const rpy = rotationsToRPY(comp.zeroedRotations);
    const [x, y, z] = comp.zeroedPosition;
    linksXml += `
  <link name="model_${i}">
    <visual>
      <origin xyz="${x} ${y} ${z}" rpy="${rpy}"/>
      <geometry>
        <mesh filename="${modelDir}/model_${i}.glb"/>
      </geometry>
    </visual>
  </link>`;
  });

  // Build <joint> elements (skip invalid topology to avoid scene-graph cycles)
  let jointsXml = '';
  const validJoints = getValidJointIndices(joints, components.length);
  // Track which components are claimed as children by valid joints
  const claimedChildren = new Set<number>();
  joints.forEach((j, i) => {
    if (!validJoints.has(i)) return;
    claimedChildren.add(j.child);
    const jointName = `joint_${i}`;
    const parentLink = j.parent !== undefined ? `model_${j.parent}` : 'model';
    const childLink = `model_${j.child}`;
    const rpy = rotationsToRPY(j.origin.rotations);
    const [x, y, z] = j.origin.position;
    let extras = '';
    if (j.axis) {
      extras += `\n    <axis xyz="${j.axis[0]} ${j.axis[1]} ${j.axis[2]}"/>`;
    }
    if (j.limit) {
      extras += `\n    <limit lower="${j.limit.lower}" upper="${j.limit.upper}" effort="0" velocity="0"/>`;
    }
    jointsXml += `
  <joint name="${jointName}" type="${j.type}">
    <origin xyz="${x} ${y} ${z}" rpy="${rpy}"/>
    <parent link="${parentLink}"/>
    <child link="${childLink}"/>${extras}
  </joint>`;
  });

  // Add implicit fixed joints for orphan components (not claimed as a child
  // by any valid joint) so every link is connected to the kinematic tree and
  // "model" remains the single URDF root.
  components.forEach((_comp, i) => {
    if (!claimedChildren.has(i)) {
      jointsXml += `
  <joint name="__auto_fixed_${i}" type="fixed">
    <origin xyz="0 0 0" rpy="0 0 0"/>
    <parent link="model"/>
    <child link="model_${i}"/>
  </joint>`;
    }
  });

  return `<?xml version="1.0"?>
<robot name="robot">${linksXml}${jointsXml}
</robot>`;
}

/**
 * Adjust materials on a Three.js object tree for ghost rendering.
 */
function adjustMaterials(obj: Object3D, color?: string, opacity?: number): void {
  obj.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
      const mat = mesh.material as MeshStandardMaterial;
      mat.metalness = 0;
      mat.roughness = 1;
      if (color) mat.color.set(color);
      if (opacity !== undefined && opacity < 1) {
        mat.transparent = true;
        mat.opacity = opacity;
      }
    }
  });
}

/**
 * Custom hook: parse URDF XML built from config and load GLB meshes for each link visual.
 * Returns the URDFRobot object (or null while loading).
 */
function useURDFFromConfig(
  model: string,
  modelRotations: Rotation[],
  modelPosition: [number, number, number],
  components: RobotConfigComponent[],
  joints: RobotConfigJoint[],
  color?: string,
  opacity?: number,
): URDFRobotModel | null {
  const [robot, setRobot] = useState<URDFRobotModel | null>(null);

  // Derive the model directory from the model path (e.g. "/3d-models/Robot_X/model.glb" → "/3d-models/Robot_X")
  const modelDir = useMemo(() => {
    const idx = model.lastIndexOf('/');
    return idx !== -1 ? model.substring(0, idx) : '';
  }, [model]);

  // Serialised keys for deps (avoid re-running on every render)
  const componentsKey = useMemo(() => JSON.stringify(components), [components]);
  const jointsKey = useMemo(() => JSON.stringify(joints), [joints]);

  useEffect(() => {
    const urdfXml = buildURDFXml(components, joints, modelDir, modelRotations, modelPosition);

    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    const gltfLoader = new GLTFLoader(manager);

    // Custom mesh loader: load GLB files via GLTFLoader
    loader.loadMeshCb = (url: string, _manager: LoadingManager, onComplete) => {
      gltfLoader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;
          adjustMaterials(scene, color, opacity);
          onComplete(scene);
        },
        undefined,
        (err) => {
          console.error(`Failed to load mesh ${url}:`, err);
          onComplete(new Object3D()); // empty placeholder
        },
      );
    };

    const parsed = loader.parse(urdfXml);
    adjustMaterials(parsed, color, opacity);
    setRobot(parsed);

    return () => {
      setRobot(null);
    };
  }, [componentsKey, jointsKey, modelDir, modelRotations, modelPosition, color, opacity]);

  return robot;
}

export default function Robot({ object }: RobotProps) {
  const {
    poses, model, modelRotations, modelPosition,
    components = [], joints, jointValues,
  } = object;
  const color = object.type === 'ghost' ? object.color : undefined;
  const opacity = object.type === 'ghost' ? 0.5 : 1.0;

  const robot = useURDFFromConfig(
    model, modelRotations, modelPosition, components, joints ?? [], color, opacity,
  );

  // Apply joint values reactively
  useEffect(() => {
    if (!robot || !jointValues) return;
    robot.setJointValues(jointValues);
  }, [robot, jointValues]);

  if (!robot) return null;

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
            <primitive object={index === 0 ? robot : robot.clone()} />
          </group>
        );
      })}
    </>
  );
}
