import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import Field3d from "./field/Field3d.tsx";
import { FieldObject } from "./field/components/types";
import { loadRobotFromConfig } from "./field/components/robotConfigLoader";

// Static field objects
const staticObjects: FieldObject[] = [
  // Trajectory showing robot path
  {
    type: 'trajectory',
    color: '#00ff00',
    size: 'medium',
    poses: [
      { translation: [0.0, 0.0, 0.0], rotation: [1, 0, 0, 0] },
      { translation: [1.0, 0.5, 0.0], rotation: [1, 0, 0, 0] },
      { translation: [2.0, 1.0, 0.0], rotation: [1, 0, 0, 0] },
      { translation: [3.0, 1.0, 0.0], rotation: [1, 0, 0, 0] },
    ],
  },
  // Coordinate axes at origin
  {
    type: 'axes',
    poses: [
      { translation: [0.0, 0.0, 0.0], rotation: [1, 0, 0, 0] },
    ],
  },
];

function App() {
  const [objects, setObjects] = useState<FieldObject[]>(staticObjects);

  useEffect(() => {
    // Load robot with config
    loadRobotFromConfig(
      '/3d-models/Robot_BananaSplitV4/config.json',
      {
        translation: [2.0, 0.0, 0.0],
        rotation: [1, 0, 0, 0],
      }
    ).then((robot) => {
      setObjects([robot, ...staticObjects]);
    });
  }, []);

  return (
    <div id="canvas-container">
      <Field3d
        game="Reefscape"
        origin="red"
        backgroundColor="#1a1a1a"
        style={{ width: '100%', height: '100vh' }}
        objects={objects}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
