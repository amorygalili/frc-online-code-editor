/* --------------------------------------------------------------------------------------------
 * Test entry point for local Docker container testing
 * ------------------------------------------------------------------------------------------ */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { initLocaleLoader } from "monaco-editor-wrapper/vscode/locale";
import TestApp from './TestApp'
import './index.css'
import './App.css'
import './test.css'

const runTestApp = async () => {
  await initLocaleLoader();

  ReactDOM.createRoot(document.getElementById('test-root')!).render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>,
  );
};

runTestApp().catch(console.error);
