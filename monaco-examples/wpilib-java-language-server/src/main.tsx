/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { initLocaleLoader } from "monaco-editor-wrapper/vscode/locale";
import App from './App.tsx'
import './index.css'

const runWPILibReactApp = async () => {
  await initLocaleLoader();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

runWPILibReactApp().catch(console.error);
