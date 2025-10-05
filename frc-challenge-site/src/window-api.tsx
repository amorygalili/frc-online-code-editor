import React from "react";
import ReactDOM from "react-dom/client";
import { initLocaleLoader } from "monaco-editor-wrapper/vscode/locale";
import TestApp from "./TestApp";
import "./index.css";
import "./App.css";
import "./test.css";

let simVisualization = <></>;

async function mountEditor(element: HTMLElement) {
  await initLocaleLoader();

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
};

/**
 * The sim visualization component used in the editor. Has access to NT4 and HALSim data provided by the
 * HalSimContext and NT4Context providers.
 * @param element 
 */
function setSimVisualization(element: JSX.Element) {
    simVisualization = element;
}

function getSimVisualization() {
    return simVisualization;
}

(window as any).frcChallengeApi = {
  mountEditor,
  setSimVisualization,
  getSimVisualization
};
