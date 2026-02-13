import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import Field3d from "./field/Field3d.tsx";
import { FieldObject } from "./field/components/types";
import { loadRobotFromConfig } from "./field/components/robotConfigLoader";
import RobotConfigEditor from "./editor/RobotConfigEditor";

// Static field objects
const staticObjects: FieldObject[] = [
  // Trajectory showing robot path
  {
    type: 'trajectory',
    color: '#00ff00',
    size: 'medium',
    poses: [
      { translation: [0.0, 0.0, 0.0], rotation: [] },
      { translation: [1.0, 0.5, 0.0], rotation: [] },
      { translation: [2.0, 1.0, 0.0], rotation: [] },
      { translation: [3.0, 1.0, 0.0], rotation: [] },
    ],
  },
  // Coordinate axes at origin
  {
    type: 'axes',
    poses: [
      { translation: [0.0, 0.0, 0.0], rotation: [] },
    ],
  },
];

function FieldView() {
  const [objects, setObjects] = useState<FieldObject[]>(staticObjects);

  useEffect(() => {
    loadRobotFromConfig(
      '/3d-models/Robot_BananaSplitV4/config.json',
      {
        translation: [2.0, 2.0, 2],
        rotation: [],
      }
    ).then((robot) => {
      setObjects([robot, ...staticObjects]);
    });
  }, []);

  return (
    <div id="canvas-container">
      <Field3d
        game="Evergreen"
        origin="red"
        backgroundColor="#1a1a1a"
        style={{ width: '100%', height: '100vh' }}
        objects={objects}
      />
    </div>
  );
}

function App() {
  // Simple hash-based routing: #editor → config editor, anything else → field view
  const [page, setPage] = useState(() => window.location.hash === '#editor' ? 'editor' : 'field');

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === '#editor' ? 'editor' : 'field');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (page === 'editor') {
    return <RobotConfigEditor />;
  }

  return <FieldView />;
}

createRoot(document.getElementById("root")!).render(<App />);
