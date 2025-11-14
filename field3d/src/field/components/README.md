# 3D Field Components

This directory contains React Three Fiber components for rendering 3D objects on FRC fields, based on the [AdvantageScope Field3dRenderer API](https://github.com/Mechanical-Advantage/AdvantageScope).

## Components

### Robot
Displays robot models with poses, articulated components, and vision targets.

```typescript
{
  type: 'robot',
  model: '/models/robot.glb', // Path to GLB model (optional, uses default box if not provided)
  poses: [{ translation: [x, y, z], rotation: [w, x, y, z] }],
  components: [], // Articulated component poses
  visionTargets: [], // Vision target poses
}
```

### Ghost
Semi-transparent robot poses for showing planned or historical positions.

```typescript
{
  type: 'ghost',
  model: '/models/robot.glb',
  color: '#00ff00', // Required color
  poses: [{ translation: [x, y, z], rotation: [w, x, y, z] }],
  components: [],
  visionTargets: [],
}
```

### GamePiece
Game pieces at various field positions.

```typescript
{
  type: 'gamePiece',
  variant: 'note', // 'note', 'cone', 'cube', 'cargo', 'power cell'
  poses: [{ translation: [x, y, z], rotation: [w, x, y, z] }],
}
```

### Trajectory
Robot path visualization.

```typescript
{
  type: 'trajectory',
  color: '#ff0000',
  size: 'medium', // 'small', 'medium', 'large'
  poses: [
    { translation: [x1, y1, z1], rotation: [w, x, y, z] },
    { translation: [x2, y2, z2], rotation: [w, x, y, z] },
    // ... more points
  ],
}
```

### AprilTag
AprilTag markers at custom positions.

```typescript
{
  type: 'aprilTag',
  variant: 'frc-36h11', // 'frc-36h11', 'frc-16h5', 'ftc-2in', 'ftc-3in', 'ftc-4in', 'ftc-5in'
  poses: [{ translation: [x, y, z], rotation: [w, x, y, z] }],
}
```

### Axes
Coordinate system axes at poses.

```typescript
{
  type: 'axes',
  poses: [{ translation: [x, y, z], rotation: [w, x, y, z] }],
}
```

### Cone
Vision cones for camera field of view visualization.

```typescript
{
  type: 'cone',
  color: '#ffff00',
  position: 'front', // 'center', 'back', 'front'
  poses: [{ translation: [x, y, z], rotation: [w, x, y, z] }],
}
```

## Usage

```typescript
import Field3d from './field/Field3d';
import { FieldObject } from './field/components/types';

const objects: FieldObject[] = [
  {
    type: 'robot',
    model: '',
    poses: [{ translation: [2.0, 0.0, 0.0], rotation: [1, 0, 0, 0] }],
    components: [],
    visionTargets: [],
  },
  {
    type: 'trajectory',
    color: '#00ff00',
    size: 'medium',
    poses: [
      { translation: [0.0, 0.0, 0.0], rotation: [1, 0, 0, 0] },
      { translation: [1.0, 0.5, 0.0], rotation: [1, 0, 0, 0] },
      { translation: [2.0, 1.0, 0.0], rotation: [1, 0, 0, 0] },
    ],
  },
];

function MyComponent() {
  return (
    <Field3d
      game="2024-crescendo"
      origin="blue"
      objects={objects}
    />
  );
}
```

## Coordinate System

All poses use the WPILib coordinate system:
- **X**: Forward (towards opposing alliance wall)
- **Y**: Left (when looking from driver station)
- **Z**: Up
- **Rotation**: Quaternion `[w, x, y, z]`

The origin is at the driver station, and the field is automatically flipped based on the `origin` prop ('red' or 'blue').

## Notes

- Rotation is specified as a quaternion array: `[w, x, y, z]`
- Translation is in meters: `[x, y, z]`
- All components support multiple poses (array of Pose3d)
- Robot models should be in GLB format
- Default geometries are provided when models are not specified

