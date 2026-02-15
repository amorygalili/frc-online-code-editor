import React from 'react';
import { FieldObject } from './field-objects/types';
import GamePiece from './field-objects/GamePiece';
import Robot from './field-objects/Robot';
import Trajectory from './field-objects/Trajectory';
import Axes from './field-objects/Axes';
import AprilTag from './field-objects/AprilTag';
import VisionCone from './field-objects/Cone';

/**
 * Extracts FieldObject data from React children components.
 * This allows users to pass field objects as JSX children instead of as a prop array.
 * 
 * Example:
 * <Field3d game="Evergreen" origin="red">
 *   <GamePiece variant="note" poses={...} />
 *   <Trajectory color="#00ff00" size="medium" poses={...} />
 * </Field3d>
 */
export function extractFieldObjectsFromChildren(children: React.ReactNode): FieldObject[] {
  const objects: FieldObject[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    const props = child.props as any;

    // GamePiece component
    if (child.type === GamePiece) {
      objects.push({
        type: 'gamePiece',
        variant: props.variant,
        poses: props.poses,
      });
    }
    // Robot component
    else if (child.type === Robot) {
      objects.push({
        type: props.type || 'robot',
        model: props.model,
        modelRotations: props.modelRotations,
        modelPosition: props.modelPosition,
        poses: props.poses,
        components: props.components || [],
        cameras: props.cameras,
        joints: props.joints,
        jointValues: props.jointValues,
        color: props.color,
        opacity: props.opacity,
      });
    }
    // Trajectory component
    else if (child.type === Trajectory) {
      objects.push({
        type: 'trajectory',
        color: props.color,
        size: props.size,
        poses: props.poses,
      });
    }
    // Axes component
    else if (child.type === Axes) {
      objects.push({
        type: 'axes',
        poses: props.poses,
      });
    }
    // AprilTag component
    else if (child.type === AprilTag) {
      objects.push({
        type: props.type || 'aprilTag',
        poses: props.poses,
        variant: props.variant,
      });
    }
    // VisionCone component
    else if (child.type === VisionCone) {
      objects.push({
        type: 'cone',
        color: props.color,
        position: props.position,
        poses: props.poses,
      });
    }
  });

  return objects;
}

