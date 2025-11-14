import { createRoot } from "react-dom/client";
import Field3d from "./Field3d.tsx";

function App() {
  return (
    <div id="canvas-container">
      <Field3d
        game="Reefscape"
        origin="red"
        backgroundColor="#1a1a1a"
        style={{ width: '100%', height: '100vh' }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
