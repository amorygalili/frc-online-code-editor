import { useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import {
  ArrowHelper,
  DoubleSide,
  Euler,
  Group,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three-stdlib';
import URDFLoader from 'urdf-loader';
import { URDFRobot as URDFRobotModel, URDFVisual } from 'urdf-loader';
import { rotation3dToQuaternion } from '../utils';
import type { Rotation } from '../field/field-interfaces';
import { getValidJointIndices } from '../field/components/robotConfigLoader';
import type { RobotConfigComponent, RobotConfigJoint } from '../field/components/robotConfigLoader';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Reset metalness/roughness so models render well without an environment map. */
function adjustMaterials(obj: Object3D): void {
  obj.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
      mesh.material.metalness = 0;
      mesh.material.roughness = 1;
    }
  });
}

function rotationsToRPY(rotations: Rotation[]): string {
  const q = rotation3dToQuaternion(rotations);
  const euler = new Euler().setFromQuaternion(q, 'ZYX');
  return `${euler.x} ${euler.y} ${euler.z}`;
}

/**
 * Apply RPY rotation to an Object3D, matching urdf-loader's `applyRotation`.
 * Resets rotation to identity first, then applies rpy in ZYX intrinsic order.
 */
function applyRPY(obj: Object3D, rpy: [number, number, number]): void {
  obj.rotation.set(0, 0, 0);
  const euler = new Euler(rpy[0], rpy[1], rpy[2], 'ZYX');
  const q = new Quaternion().setFromEuler(euler);
  q.multiply(obj.quaternion);
  obj.quaternion.copy(q);
}

/** Parse an RPY string "r p y" into a tuple. */
function parseRPY(rpy: string): [number, number, number] {
  const parts = rpy.trim().split(/\s+/).map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Build URDF XML using a URL map instead of a directory path.
 * `urlMap` maps logical names ("model", "model_0", …) to blob/object URLs.
 */
function buildEditorURDFXml(
  components: RobotConfigComponent[],
  joints: RobotConfigJoint[],
  urlMap: Record<string, string>,
  modelRotations: Rotation[],
  modelPosition: [number, number, number],
): string {
  const baseRpy = rotationsToRPY(modelRotations);
  const [bx, by, bz] = modelPosition;
  const baseUrl = urlMap['model'] ?? '';

  let linksXml = `
  <link name="model">
    <visual>
      <origin xyz="${bx} ${by} ${bz}" rpy="${baseRpy}"/>
      <geometry><mesh filename="${baseUrl}"/></geometry>
    </visual>
  </link>`;

  components.forEach((_comp, i) => {
    const url = urlMap[`model_${i}`] ?? '';
    // Use placeholder origin — will be patched in-place by the property effect
    linksXml += `
  <link name="model_${i}">
    <visual>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <geometry><mesh filename="${url}"/></geometry>
    </visual>
  </link>`;
  });

  let jointsXml = '';
  const validJoints = getValidJointIndices(joints, components.length);
  // Track which components are claimed as children by valid joints
  const claimedChildren = new Set<number>();
  joints.forEach((j, i) => {
    if (!validJoints.has(i)) return; // skip invalid topology
    claimedChildren.add(j.child);
    const parentLink = j.parent !== undefined ? `model_${j.parent}` : 'model';
    const childLink = `model_${j.child}`;
    // Use placeholder origin/axis/limit — will be patched in-place by the property effect
    jointsXml += `
  <joint name="joint_${i}" type="${j.type}">
    <origin xyz="0 0 0" rpy="0 0 0"/>
    <parent link="${parentLink}"/>
    <child link="${childLink}"/>
    <axis xyz="0 1 0"/>
    <limit lower="-3.14159" upper="3.14159" effort="0" velocity="0"/>
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

  return `<?xml version="1.0"?>\n<robot name="robot">${linksXml}${jointsXml}\n</robot>`;
}

// ── structural key ──────────────────────────────────────────────────────────

/**
 * Compute a key that changes only when the scene-graph *structure* changes:
 * number of components, number of joints, joint types, parent/child topology,
 * and mesh URLs. Property-only changes (positions, rotations, axes, limits)
 * are excluded — those are applied in-place.
 */
function computeStructuralKey(
  components: RobotConfigComponent[],
  joints: RobotConfigJoint[],
  urlMap: Record<string, string>,
): string {
  const structure = {
    numComponents: components.length,
    joints: joints.map((j) => ({
      type: j.type,
      parent: j.parent,
      child: j.child,
    })),
    urls: urlMap,
  };
  return JSON.stringify(structure);
}

// ── in-place property patching ──────────────────────────────────────────────

/**
 * Mutate the existing URDFRobot in-place to reflect current property values
 * (visual origins, joint origins, axes, limits) without rebuilding the scene graph.
 */
function patchRobotProperties(
  robot: URDFRobotModel,
  components: RobotConfigComponent[],
  joints: RobotConfigJoint[],
  modelRotations: Rotation[],
  modelPosition: [number, number, number],
): void {
  // ── Patch base model visual origin ──
  const baseLink = robot.links['model'] ?? robot;
  const baseVisual = findVisual(baseLink);
  if (baseVisual) {
    const [bx, by, bz] = modelPosition;
    baseVisual.position.set(bx, by, bz);
    const baseRpy = parseRPY(rotationsToRPY(modelRotations));
    applyRPY(baseVisual, baseRpy);
  }

  // ── Patch component visual origins ──
  components.forEach((comp, i) => {
    const link = robot.links[`model_${i}`];
    if (!link) return;
    const visual = findVisual(link);
    if (!visual) return;
    const [x, y, z] = comp.zeroedPosition;
    visual.position.set(x, y, z);
    const rpy = parseRPY(rotationsToRPY(comp.zeroedRotations));
    applyRPY(visual, rpy);
  });

  // ── Patch joint properties ──
  joints.forEach((j, i) => {
    const joint = robot.joints[`joint_${i}`];
    if (!joint) return;

    // Origin position + rotation
    const [x, y, z] = j.origin.position;
    joint.position.set(x, y, z);
    const rpy = parseRPY(rotationsToRPY(j.origin.rotations));
    applyRPY(joint, rpy);

    // Reset origPosition/origQuaternion so setJointValue works from the new origin.
    // These properties exist at runtime but are not in the TS type definitions.
    (joint as any).origPosition = joint.position.clone();
    (joint as any).origQuaternion = joint.quaternion.clone();

    // Axis
    if (j.axis) {
      joint.axis.set(j.axis[0], j.axis[1], j.axis[2]).normalize();
    }

    // Limits
    if (j.limit) {
      joint.limit.lower = j.limit.lower;
      joint.limit.upper = j.limit.upper;
    }
  });

  robot.updateWorldMatrix(true, true);
}

/** Find the first URDFVisual child of a link. */
function findVisual(link: Object3D): URDFVisual | null {
  for (const child of link.children) {
    if ((child as URDFVisual).isURDFVisual) return child as URDFVisual;
  }
  return null;
}

// ── hook ─────────────────────────────────────────────────────────────────────

function useEditorURDF(
urlMap: Record<string, string>, modelRotations: Rotation[], modelPosition: [number, number, number], components: RobotConfigComponent[], joints: RobotConfigJoint[], jointValues: Record<string, number>,
): { robot: URDFRobotModel | null; meshesLoaded: number } {
  const [robot, setRobot] = useState<URDFRobotModel | null>(null);
  // Counter bumped after every successful parse so the property-patch effect
  // runs once the new robot is in state.
  const [parseGeneration, setParseGeneration] = useState(0);
  // Counter bumped when all meshes finish loading (async GLTF loads).
  // Downstream effects (e.g. hidden-model opacity) depend on this so they
  // re-run after the mesh materials are actually available.
  const [meshesLoaded, setMeshesLoaded] = useState(0);

  // Key that changes only on structural changes (topology + mesh URLs)
  const structuralKey = useMemo(
    () => computeStructuralKey(components, joints, urlMap),
    [components, joints, urlMap],
  );

  // ── Effect 1: full reparse on structural changes ──
  useEffect(() => {
    if (!urlMap['model']) { setRobot(null); return; }
    let cancelled = false;
    const xml = buildEditorURDFXml(components, joints, urlMap, modelRotations, modelPosition);
    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    const gltfLoader = new GLTFLoader(manager);
    // When all meshes finish loading, bump meshesLoaded so downstream effects
    // (hidden-model opacity, helpers, etc.) re-run with the real materials.
    manager.onLoad = () => {
      if (!cancelled) setMeshesLoaded((n) => n + 1);
    };
    loader.loadMeshCb = (url: string, _mgr: LoadingManager, onComplete) => {
      if (!url) { onComplete(new Object3D()); return; }
      gltfLoader.load(url, (gltf) => {
        adjustMaterials(gltf.scene);
        onComplete(gltf.scene);
      }, undefined, (err) => {
        console.error('Mesh load error:', err);
        onComplete(new Object3D());
      });
    };
    const parsed = loader.parse(xml);
    adjustMaterials(parsed);
    // Apply current property values immediately so the first render is correct
    patchRobotProperties(parsed, components, joints, modelRotations, modelPosition);
    setRobot(parsed);
    setParseGeneration((g) => g + 1);
    return () => { cancelled = true; setRobot(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey]);

  // ── Effect 2: in-place property patch (no reparse) ──
  useEffect(() => {
    if (!robot) return;
    patchRobotProperties(robot, components, joints, modelRotations, modelPosition);
    // Add random offset to joint values to force update
    const updatedJointValues: Record<string, number> = {};
    for (const [name, value] of Object.entries(jointValues)) {
      updatedJointValues[name] = value + Math.random() * .001;
    }
    robot.setJointValues(updatedJointValues);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robot, parseGeneration, components, joints, modelRotations, modelPosition]);

  return { robot, meshesLoaded };
}

export { useEditorURDF, buildEditorURDFXml };

// ── props ────────────────────────────────────────────────────────────────────

export interface RobotPreview3dProps {
  urlMap: Record<string, string>;
  modelRotations: Rotation[];
  modelPosition: [number, number, number];
  components: RobotConfigComponent[];
  joints: RobotConfigJoint[];
  jointValues: Record<string, number>;
  hiddenModels: Set<string>;
  showJointHelpers?: boolean;
  jointColors: string[];  // Array of hex color strings, one per joint
}

/** Size constants for joint visualisation helpers */
const AXIS_LENGTH = 0.15;          // arrow length in metres
const AXIS_HEAD = 0.03;            // arrow-head size
const RING_RADIUS = 0.04;          // torus major radius
const RING_TUBE = 0.003;           // torus tube radius
const SPHERE_RADIUS = 0.008;       // origin-point sphere

/**
 * Build a Group containing visual helpers for every joint in the robot.
 * Must be called whenever the robot reference or joint values change so
 * world positions are up-to-date.
 */
function buildJointHelpers(robot: URDFRobotModel, jointColors: string[]): Group {
  const helpersGroup = new Group();
  helpersGroup.name = '__jointHelpers';

  const sphereGeo = new SphereGeometry(SPHERE_RADIUS, 12, 12);
  const torusGeo = new TorusGeometry(RING_RADIUS, RING_TUBE, 16, 48);

  for (const [name, joint] of Object.entries(robot.joints)) {
    // Skip auto-generated fixed joints for orphan components
    if (name.startsWith('__auto_fixed_')) continue;
    const jType = joint.jointType;
    // Extract joint index from name (e.g., "joint_0" -> 0)
    const jointIdx = parseInt(name.replace('joint_', ''), 10);
    const colorHex = jointColors[jointIdx] ?? '#888888';
    const color = parseInt(colorHex.replace('#', ''), 16);

    // Container positioned at the joint's world location
    const container = new Group();
    container.name = `helper_${name}`;

    // World position of the joint
    const worldPos = new Vector3();
    joint.getWorldPosition(worldPos);
    container.position.copy(worldPos);

    // World-space axis direction
    const axisDir = joint.axis.clone().normalize();
    // Transform axis from joint-local to world (rotation only)
    const worldQuat = joint.getWorldQuaternion(new Quaternion());
    axisDir.applyQuaternion(worldQuat);

    // 1. Origin sphere
    const sphereMat = new MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 });
    const sphere = new Mesh(sphereGeo, sphereMat);
    sphere.renderOrder = 999;
    container.add(sphere);

    // 2. Axis arrow (both directions for prismatic)
    if (jType !== 'fixed') {
      const arrow = new ArrowHelper(axisDir, new Vector3(), AXIS_LENGTH, color, AXIS_HEAD, AXIS_HEAD * 0.6);
      arrow.renderOrder = 999;
      arrow.userData.__negative = false;
      container.add(arrow);

      if (jType === 'prismatic') {
        // Second arrow in the opposite direction
        const arrowNeg = new ArrowHelper(axisDir.clone().negate(), new Vector3(), AXIS_LENGTH, color, AXIS_HEAD, AXIS_HEAD * 0.6);
        arrowNeg.renderOrder = 999;
        arrowNeg.userData.__negative = true;
        container.add(arrowNeg);
      }
    }

    // 3. Rotation ring for revolute
    if (jType === 'revolute') {
      const torusMat = new MeshBasicMaterial({
        color, side: DoubleSide, depthTest: false, transparent: true, opacity: 0.45,
      });
      const torus = new Mesh(torusGeo, torusMat);
      torus.renderOrder = 999;
      // Orient torus so its normal aligns with axisDir
      torus.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axisDir);
      container.add(torus);
    }

    helpersGroup.add(container);
  }

  return helpersGroup;
}

/** Inner scene component (must be inside Canvas) */
function RobotScene({ urlMap, modelRotations, modelPosition, components, joints, jointValues, hiddenModels, showJointHelpers, jointColors }: RobotPreview3dProps) {
  const { robot, meshesLoaded } = useEditorURDF(urlMap, modelRotations, modelPosition, components, joints, jointValues);
  const [helpersGroup, setHelpersGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!robot) return;
    robot.setJointValues(jointValues);
  }, [robot, jointValues]);

  // Adjust material opacity: hidden → 0%, normal → 100%
  // Depends on meshesLoaded so it re-runs after async GLTF meshes arrive.
  useEffect(() => {
    if (!robot) return;
    const linkNames = ['model', ...components.map((_, i) => `model_${i}`)];
    for (const name of linkNames) {
      const link = robot.links[name];
      if (!link) continue;
      const opacity = hiddenModels.has(name) ? 0 : 1;
      link.traverse((node) => {
        const mesh = node as Mesh;
        if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
          mesh.material.transparent = opacity < 1;
          mesh.material.opacity = opacity;
          mesh.material.needsUpdate = true;
        }
      });
    }
  }, [robot, meshesLoaded, hiddenModels, components]);

  // Create helpers group when robot changes
  useEffect(() => {
    if (!robot || Object.keys(robot.joints).length === 0) {
      setHelpersGroup(null);
      return;
    }
    robot.updateWorldMatrix(true, true);
    setHelpersGroup(buildJointHelpers(robot, jointColors));
  }, [robot, jointColors]);

  // Update helper positions every frame so they track joint world transforms
  useFrame(() => {
    if (!helpersGroup || !robot) return;

    helpersGroup.visible = !!showJointHelpers;
    if (!showJointHelpers) return;

    for (const container of helpersGroup.children) {
      const jointName = container.name.replace('helper_', '');
      const joint = robot.joints[jointName];
      if (!joint) continue;

      // Update container position to joint world position
      joint.getWorldPosition(container.position);

      // Compute world-space axis direction
      const axisDir = joint.axis.clone().normalize();
      const wq = joint.getWorldQuaternion(new Quaternion());
      axisDir.applyQuaternion(wq);

      // Update arrow directions and torus orientation
      for (const sub of container.children) {
        if (sub instanceof ArrowHelper) {
          const dir = sub.userData.__negative ? axisDir.clone().negate() : axisDir.clone();
          sub.setDirection(dir);
        }
        if (sub instanceof Mesh && sub.geometry instanceof TorusGeometry) {
          sub.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), axisDir);
        }
      }
    }
  });

  if (!robot) return null;
  return (
    <>
      <primitive object={robot} />
      {helpersGroup && <primitive object={helpersGroup} />}
    </>
  );
}

/** Standalone 3D preview canvas for the robot config editor. */
export default function RobotPreview3d(props: RobotPreview3dProps) {
  return (
    <Canvas
      camera={{ position: [1.5, 1.5, 1.5] as any, fov: 50, near: 0.01, far: 100, up: [0, 0, 1] as any }}
      gl={{ antialias: true }}
      style={{ background: '#1e1e1e' }}
    >
      <pointLight position={[0, 0, 10]} intensity={0.2} color={0xffffff} />
      <hemisphereLight args={[0xffffff, 0x444444, 1]} position={[0, 0, 1]} />
      <RobotScene {...props} />
      <OrbitControls makeDefault />
      <gridHelper args={[4, 20, '#555', '#333']} rotation={[Math.PI / 2, 0, 0]} />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport axisColors={['red', 'green', 'blue']} labels={['X', 'Y', 'Z']} />
      </GizmoHelper>
    </Canvas>
  );
}

