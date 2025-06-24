/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { memo, useEffect, useRef } from "react";
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
      `/home/jdtls/workspace.code-workspace`
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
  const { editorWrapper: wrapper, openFile } = useEditor();

  useEffect(() => {
    const initializeEditor = async () => {
      if (!containerRef.current || isInitialized.current) return;

      isInitialized.current = true;

      try {
        await initEditor(containerRef.current, wrapper);

        // Set up event listeners for file navigation (Go to Definition, etc.)
        // Wait for the editor to be fully ready before setting up navigation
        // setTimeout(() => {
        //   console.log("Setting up file navigation listeners...");
        //   const disposables: vscode.Disposable[] = [];

        //   // Helper function to extract relative path and open in tabs
        //   const handleFileOpen = async (uri: vscode.Uri) => {
        //     if (uri.scheme === "file") {
        //       const filePath = uri.path;
        //       console.log("File navigation detected:", filePath);

        //       // Extract relative path from the base path
        //       const basePath = eclipseJdtLsConfig.basePath;
        //       console.log("Base path:", basePath);

        //       let relativePath: string;
        //       if (filePath.startsWith(basePath)) {
        //         relativePath = filePath.substring(basePath.length + 1);
        //       } else {
        //         // Try to find the relative path by looking for common patterns
        //         const pathParts = filePath.split("/");
        //         const basePathParts = basePath.split("/");

        //         // Find where the paths diverge and extract the relative part
        //         let startIndex = -1;
        //         for (
        //           let i = 0;
        //           i < Math.min(pathParts.length, basePathParts.length);
        //           i++
        //         ) {
        //           if (
        //             pathParts[i] === basePathParts[basePathParts.length - 1]
        //           ) {
        //             startIndex = i + 1;
        //             break;
        //           }
        //         }

        //         if (startIndex >= 0) {
        //           relativePath = pathParts.slice(startIndex).join("/");
        //         } else {
        //           // Fallback: just use the filename if we can't determine the relative path
        //           relativePath = pathParts[pathParts.length - 1];
        //         }
        //       }

        //       console.log("Relative path:", relativePath);

        //       if (relativePath && relativePath.endsWith(".java")) {
        //         try {
        //           await openFile(relativePath);
        //         } catch (error) {
        //           console.error("Failed to open file in tab:", error);
        //         }
        //       }
        //     }
        //   };

        //   // Listen for active text editor changes
        //   disposables.push(
        //     vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        //       if (editor && editor.document) {
        //         await handleFileOpen(editor.document.uri);
        //       }
        //     })
        //   );

        //   // Listen for workspace document opens (this catches Go to Definition)
        //   disposables.push(
        //     vscode.workspace.onDidOpenTextDocument(async (document) => {
        //       await handleFileOpen(document.uri);
        //     })
        //   );

        //   // Also listen for when text documents are shown
        //   disposables.push(
        //     vscode.window.onDidChangeVisibleTextEditors(async (editors) => {
        //       for (const editor of editors) {
        //         if (editor.document) {
        //           await handleFileOpen(editor.document.uri);
        //         }
        //       }
        //     })
        //   );

        //   // Store the disposables for cleanup
        //   (wrapper as any)._fileNavigationDisposables = disposables;

        //   // Also intercept showTextDocument calls directly
        //   const originalShowTextDocument = vscode.window.showTextDocument;
        //   const interceptedShowTextDocument = async (...args: any[]) => {
        //     console.log("showTextDocument intercepted:", args[0]);

        //     // Call the original function first
        //     const result = await (originalShowTextDocument as any).apply(
        //       vscode.window,
        //       args
        //     );

        //     // Then handle our tab opening
        //     const document = args[0];
        //     if (document && document.uri) {
        //       await handleFileOpen(document.uri);
        //     } else if (typeof document === "object" && document.resource) {
        //       await handleFileOpen(document.resource);
        //     }

        //     return result;
        //   };

        //   // Replace the function
        //   (vscode.window as any).showTextDocument = interceptedShowTextDocument;

        //   // Store reference for cleanup
        //   (wrapper as any)._originalShowTextDocument = originalShowTextDocument;
        // }, 1000);
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
        border: "1px solid #ccc",
        overflow: "hidden",
      }}
    />
  );
});
