import { createRoot } from "react-dom/client";
import Field3d from "./field/Field3d.tsx";
import { FieldObject } from "./field/components/types";

// Example field objects to demonstrate the 3D components
const exampleObjects: FieldObject[] = [
  // Robot at center of field
  {
    type: 'robot',
    model: '', // Will use default box model
    poses: [
      {
        translation: [2.0, 0.0, 0.0],
        rotation: [1, 0, 0, 0], // [w, x, y, z] quaternion
      },
    ],
    components: [],
    visionTargets: [],
  },
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
  return (
    <div id="canvas-container">
      <Field3d
        game="Reefscape"
        origin="red"
        backgroundColor="#1a1a1a"
        style={{ width: '100%', height: '100vh' }}
        objects={exampleObjects}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
