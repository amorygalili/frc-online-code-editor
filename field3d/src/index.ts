// Main Field3d component
export { default as Field3d } from './field/components/Field3d';

// Field object components
export { default as Robot } from './field/components/field-objects/Robot';
export { default as GamePiece } from './field/components/field-objects/GamePiece';
export { default as Trajectory } from './field/components/field-objects/Trajectory';
export { default as Axes } from './field/components/field-objects/Axes';
export { default as AprilTag } from './field/components/field-objects/AprilTag';
export { default as VisionCone } from './field/components/field-objects/Cone';

// Types
export * from './field/components/field-objects/types';
export * from './field/field-interfaces';
export type { FieldConfig } from './field/field-configs';

// Field configurations
export { configs as fieldConfigs } from './field/field-configs';

// Utilities
export { loadRobotFromConfig } from './field/robotConfigLoader';

