# 3D Field Components

This directory contains React Three Fiber components for rendering 3D objects on FRC fields, based on the [AdvantageScope Field3dRenderer API](https://github.com/Mechanical-Advantage/AdvantageScope).

## Components

### Robot
Displays robot models with poses, articulated components, and vision targets.

```typescript
{
  type: 'robot',
  model: '/models/robot.glb', // Path to GLB model (optional, uses default box if not provided)
  poses: [{ translation: [x, y, z], rotation: [{ axis: 'z', degrees: 90 }] }],
  components: [], // Articulated component poses (optional, loaded from config.json if not provided)
  visionTargets: [], // Vision target poses (optional, loaded from cameras in config.json if not provided)
}
```

**Loading Robot Configs:**

Use the `loadRobotFromConfig()` function to automatically load a robot's `config.json` file and create a complete RobotObj with components and vision targets:

```typescript
import { loadRobotFromConfig } from './field/components/robotConfigLoader';

// Load robot with config
const robot = await loadRobotFromConfig(
  '/3d-models/Robot_BananaSplitV4/config.json',
  {
    translation: [2.0, 0.0, 0.0],
    rotation: [],
  }
);

// Add to your field objects array
const objects = [robot, ...otherObjects];
```

The config.json file can include:
- `rotations`: Base rotation adjustments for the robot model
- `position`: Base position offset for the robot model
- `components`: Articulated components (arms, elevators, etc.) with their zeroed positions and rotations
  - Component models are loaded from `model_0.glb`, `model_1.glb`, etc. in the same directory
  - Or from explicit `src` paths if specified in the component config
- `cameras`: Camera positions that will be rendered as vision targets (red spheres)

Example config.json structure:
```json
{
  "name": "My Robot",
  "rotations": [{ "axis": "x", "degrees": 90 }],
  "position": [0, 0, 0.04],
  "cameras": [
    {
      "name": "Front Camera",
      "position": [0.25, 0.24, 0.17],
      "rotations": [{ "axis": "y", "degrees": -28.125 }],
      "resolution": [1600, 1200],
      "fov": 75
    }
  ],
  "components": [
    {
      "zeroedPosition": [-0.61, 0, -0.005],
      "zeroedRotations": [
        { "axis": "x", "degrees": 90 },
        { "axis": "z", "degrees": 90 }
      ]
    }
  ]
}
```

### Ghost
Semi-transparent robot poses for showing planned or historical positions.

```typescript
{
  type: 'ghost',
  model: '/models/robot.glb',
  color: '#00ff00', // Required color
  poses: [{ translation: [x, y, z], rotation: [{ axis: 'z', degrees: 90 }] }],
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
  poses: [{ translation: [x, y, z], rotation: [] }],
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
    { translation: [x1, y1, z1], rotation: [] },
    { translation: [x2, y2, z2], rotation: [] },
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
  poses: [{ translation: [x, y, z], rotation: [{ axis: 'y', degrees: 90 }] }],
}
```

### Axes
Coordinate system axes at poses.

```typescript
{
  type: 'axes',
  poses: [{ translation: [x, y, z], rotation: [] }],
}
```

### Cone
Vision cones for camera field of view visualization.

```typescript
{
  type: 'cone',
  color: '#ffff00',
  position: 'front', // 'center', 'back', 'front'
  poses: [{ translation: [x, y, z], rotation: [] }],
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
    poses: [{ translation: [2.0, 0.0, 0.0], rotation: [] }],
    components: [],
    visionTargets: [],
  },
  {
    type: 'trajectory',
    color: '#00ff00',
    size: 'medium',
    poses: [
      { translation: [0.0, 0.0, 0.0], rotation: [] },
      { translation: [1.0, 0.5, 0.0], rotation: [] },
      { translation: [2.0, 1.0, 0.0], rotation: [] },
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
- **Rotation**: Array of axis-angle rotations `[{ axis: 'x' | 'y' | 'z', degrees: number }]`

The origin is at the driver station, and the field is automatically flipped based on the `origin` prop ('red' or 'blue').

## Notes

- Rotation is specified as an array of axis-angle rotations: `[{ axis: 'x', degrees: 90 }, { axis: 'z', degrees: 45 }]`
- Empty rotation array `[]` represents no rotation (identity)
- Translation is in meters: `[x, y, z]`
- All components support multiple poses (array of Pose3d)
- Robot models should be in GLB format
- Default geometries are provided when models are not specified

