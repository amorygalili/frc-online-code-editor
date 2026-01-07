import { mountEditor } from "frc-challenge-site";
import "./ChallengeVisualization";

// Mount the editor (for development/testing)
const rootElement = document.getElementById("root");
if (rootElement) {
  mountEditor(rootElement);
}
