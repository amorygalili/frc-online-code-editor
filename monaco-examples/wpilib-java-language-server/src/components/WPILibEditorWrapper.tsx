/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { memo, useEffect, useRef } from "react";
import { useEditor } from "../contexts/EditorContext";
import * as vscode from "vscode";
import getKeybindingsServiceOverride from "@codingame/monaco-vscode-keybindings-service-override";
import {
  RegisteredFileSystemProvider,
  RegisteredMemoryFile,
  registerFileSystemOverlay,
} from "@codingame/monaco-vscode-files-service-override";
// this is required syntax highlighting
import "@codingame/monaco-vscode-java-default-extension";
import { LogLevel } from "@codingame/monaco-vscode-api";
import {
  MonacoEditorLanguageClientWrapper,
  type WrapperConfig,
} from "monaco-editor-wrapper";
import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";
import { eclipseJdtLsConfig } from "../config.js";
import { loadWorkspaceFiles } from "../fileService";
import type { IStoredWorkspace } from "@codingame/monaco-vscode-configuration-service-override";


export const defaultViewsInit = async () => {
  const { Parts, attachPart } = await import(
    "@codingame/monaco-vscode-views-service-override"
  );
  attachPart(
    Parts.EDITOR_PART,
    document.querySelector<HTMLDivElement>("#wpilib-code-editor")!
  );
};

const createDefaultWorkspaceContent = (workspacePath: string) => {
  return JSON.stringify(
    {
      folders: [
        {
          path: workspacePath,
        },
      ],
    } as IStoredWorkspace,
    null,
    2
  );
};

async function initEditor(
  container: HTMLDivElement,
  wrapper: MonacoEditorLanguageClientWrapper
) {
  try {
    const fileSystemProvider = new RegisteredFileSystemProvider(false);
    const workspaceFileUri = vscode.Uri.file(
      `/home/frcuser/workspace.code-workspace`
    );
    fileSystemProvider.registerFile(
      new RegisteredMemoryFile(
        workspaceFileUri,
        createDefaultWorkspaceContent(eclipseJdtLsConfig.basePath)
      )
    );
    registerFileSystemOverlay(1, fileSystemProvider);

    await loadWorkspaceFiles(fileSystemProvider);

    const wrapperConfig: WrapperConfig = {
      $type: "extended",
      htmlContainer: container,
      logLevel: LogLevel.Debug,
      vscodeApiConfig: {
        viewsConfig: {
          viewServiceType: "WorkspaceService",

          viewsInitFunc: defaultViewsInit,
          htmlAugmentationInstructions: (
            htmlElement: HTMLElement | null | undefined
          ) => {
            const htmlContainer = document.createElement("div");
            htmlContainer.id = "wpilib-code-editor";
            htmlContainer.setAttribute(
              "class",
              "enable-motion underline-links monaco-workbench windows web chromium nosidebar nopanel noauxiliarybar vs-dark vscode-theme-defaults-themes-dark_modern-json"
            );

            htmlElement?.prepend(htmlContainer);
          },
        },
        serviceOverrides: {
          ...getKeybindingsServiceOverride(),
        },
        userConfiguration: {
          json: JSON.stringify({
            "workbench.colorTheme": "Default Dark Modern",
            "editor.guides.bracketPairsHorizontal": "active",
            "editor.wordBasedSuggestions": "off",
            "editor.experimental.asyncTokenization": true,
          }),
        },
      },
      editorAppConfig: {
        monacoWorkerFactory: configureDefaultWorkerFactory,
      },
      languageClientConfigs: {
        configs: {
          java: {
            connection: {
              options: {
                $type: "WebSocketUrl",
                url: "ws://localhost:30003/jdtls",
              },
            },
            clientOptions: {
              documentSelector: ["java"],
              workspaceFolder: {
                index: 0,
                name: "workspace",
                uri: vscode.Uri.file(eclipseJdtLsConfig.basePath),
              },
            },
          },
        },
      },
    };

    await wrapper.init(wrapperConfig);
    await wrapper.start();
  } catch (error) {
    console.error("Failed to initialize editor:", error);
  }
}

export const WPILibEditorWrapper = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const { editorWrapper: wrapper } = useEditor();

  useEffect(() => {
    const initializeEditor = async () => {
      if (!containerRef.current || isInitialized.current) return;
      isInitialized.current = true;
      try {
        await initEditor(containerRef.current, wrapper);
      } catch (error) {
        console.error("Failed to initialize editor:", error);
      }
    };

    initializeEditor();

    // Cleanup function
    return () => {
      // Clean up file navigation listeners
      const disposables = (wrapper as any)._fileNavigationDisposables;
      if (disposables && Array.isArray(disposables)) {
        disposables.forEach((disposable) => disposable.dispose());
      }

      // Restore original showTextDocument function
      const originalShowTextDocument = (wrapper as any)
        ._originalShowTextDocument;
      if (originalShowTextDocument) {
        (vscode.window as any).showTextDocument = originalShowTextDocument;
      }

      wrapper.dispose().catch(console.error);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="monaco-editor-container"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        maxHeight: "100%",
        overflow: "hidden",
      }}
    />
  );
});
