/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { useState, useCallback } from 'react';
import { MonacoEditorLanguageClientWrapper } from 'monaco-editor-wrapper';
import { WPILibEditorWrapper } from './components/WPILibEditorWrapper.tsx';
import { FileBrowser } from './components/FileBrowser.tsx';
import { ProjectBrowser } from './components/ProjectBrowser.tsx';
import { ProjectGenerator } from './components/ProjectGenerator.tsx';
import './App.css';

function App() {
  const [isEditorStarted, setIsEditorStarted] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showProjectBrowser, setShowProjectBrowser] = useState(false);
  const [showProjectGenerator, setShowProjectGenerator] = useState(false);
  const [editorWrapper, setEditorWrapper] = useState<MonacoEditorLanguageClientWrapper | null>(null);

  const handleEditorLoad = useCallback((wrapper: MonacoEditorLanguageClientWrapper) => {
    setEditorWrapper(wrapper);
  }, []);

  const handleStart = useCallback(async () => {
    if (editorWrapper) {
      try {
        await editorWrapper.start();
        setIsEditorStarted(true);
        console.log("Language server started...");
      } catch (error) {
        console.error("Failed to start language server:", error);
      }
    }
  }, [editorWrapper]);

  const handleDispose = useCallback(async () => {
    if (editorWrapper) {
      try {
        await editorWrapper.dispose();
        setIsEditorStarted(false);
        console.log("Language server disposed...");
      } catch (error) {
        console.error("Failed to dispose language server:", error);
      }
    }
  }, [editorWrapper]);

  return (
    <div className="wpilib-editor-app">
      <div className="header">
        <h1 className="title">WPILib Java Language Client & Language Server</h1>
        <div className="controls">
          <button
            type="button"
            onClick={handleStart}
            disabled={!editorWrapper || isEditorStarted}
          >
            Start
          </button>
          <button
            type="button"
            onClick={handleDispose}
            disabled={!editorWrapper || !isEditorStarted}
          >
            Dispose
          </button>
          <button
            type="button"
            onClick={() => setShowFileBrowser(!showFileBrowser)}
          >
            Browse Files
          </button>
          <button
            type="button"
            onClick={() => setShowProjectBrowser(!showProjectBrowser)}
          >
            WPILib Projects
          </button>
          <button
            type="button"
            onClick={() => setShowProjectGenerator(!showProjectGenerator)}
          >
            Generate Robot Project
          </button>
        </div>
        <div className="info">
          Launch backend with: <strong><code>docker compose up -d</code></strong>
        </div>
      </div>

      <div className="content">
        <div className="sidebar">
          {showFileBrowser && (
            <FileBrowser
              editorWrapper={editorWrapper}
              onClose={() => setShowFileBrowser(false)}
            />
          )}
          {showProjectBrowser && (
            <ProjectBrowser
              onClose={() => setShowProjectBrowser(false)}
            />
          )}
          {showProjectGenerator && (
            <ProjectGenerator
              onClose={() => setShowProjectGenerator(false)}
            />
          )}
        </div>

        <div className="editor-container">
          <WPILibEditorWrapper onLoad={handleEditorLoad} />
        </div>
      </div>
    </div>
  );
}

export default App;
