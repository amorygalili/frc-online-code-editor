/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { initLocaleLoader } from "monaco-editor-wrapper/vscode/locale";
import ReactDOM from "react-dom/client";
import { MonacoEditorLanguageClientWrapper } from "monaco-editor-wrapper";
import { MonacoEditorReactComp } from "@typefox/monaco-editor-react";
import { configure } from "./config.js";
import { configurePostStart } from "./common.js";

export const runApplicationPlaygroundReact = async () => {
  const configResult = await configure();
  const root = ReactDOM.createRoot(document.getElementById("react-root")!);
  const App = () => {
    return (
      <div style={{ backgroundColor: "#1f1f1f" }}>
        <MonacoEditorReactComp
          wrapperConfig={configResult.wrapperConfig}
          onLoad={async (wrapper: MonacoEditorLanguageClientWrapper) => {
            await configurePostStart(wrapper, configResult);
          }}
          onError={(e) => {
            console.error(e);
          }}
        />
      </div>
    );
  };
  root.render(<App />);
};

await initLocaleLoader();
runApplicationPlaygroundReact();
