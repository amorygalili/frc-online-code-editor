import { setSimVisualization, mountEditor } from 'frc-challenge-site';
import ChallengeVisualization from "./ChallengeVisualization";

// Set up the challenge visualization
setSimVisualization(<ChallengeVisualization />);

// Mount the editor (for development/testing)
const rootElement = document.getElementById("root");
if (rootElement) {
  mountEditor(rootElement);
}
