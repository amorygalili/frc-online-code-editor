import React from "react";
import ReactDOM from "react-dom/client";
import { initLocaleLoader } from "monaco-editor-wrapper/vscode/locale";
import TestApp from "./TestApp";
import "./index.css";
import "./App.css";
import DefaultSimulationVisualization from "./components/DefaultSimulationVisualization";
import { useNTConnection, useNTKeyExists, useNTKeys, useNTValue } from "./nt4/useNetworktables";
import { useDriverStation, useHalSimData } from "./contexts/HalSimContext";

let simVisualization: JSX.Element | null = null;

async function mountEditor(element: HTMLElement) {
  await initLocaleLoader();

  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
}

/**
 * The sim visualization component used in the editor. Has access to NT4 and HALSim data provided by the
 * HalSimContext and NT4Context providers.
 * @param element
 */
export function setSimVisualization(element: JSX.Element | null) {
  simVisualization = element;
}

export function getSimVisualization() {
  return simVisualization;
}

export function getDefaultSimVisualization() {
  return <DefaultSimulationVisualization />;
}

(window as any).frcChallengeApi = {
  mountEditor,
  setSimVisualization,
  getSimVisualization,
  getDefaultSimVisualization,
  // NT4
  useNTValue,
  useNTConnection,
  useNTKeys,
  useNTKeyExists,
  // HALSim
  useHalSimData,
  useDriverStation,
};
