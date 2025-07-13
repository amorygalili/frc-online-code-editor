/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { memo, useEffect, useRef } from "react";
import { useEditor } from "../contexts/EditorContext";
import { useConfig } from "../contexts/ConfigContext";
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

interface WPILibEditorConfig {
  serverUrl: string;
  sessionId: string;
  port: number;
}
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
  wrapper: MonacoEditorLanguageClientWrapper,
  config: WPILibEditorConfig,
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

    // Build WebSocket URL based on configuration
    const { serverUrl, sessionId, port } = config;

    // Check if serverUrl looks like an ALB domain
    const isALBEndpoint = serverUrl.includes('amazonaws.com') ||
                         serverUrl.includes('elb.amazonaws.com') ||
                         (!serverUrl.includes('localhost') && !serverUrl.includes('127.0.0.1'));

    let wsUrl: string;
    if (isALBEndpoint) {
      // For ALB endpoints, don't include port - ALB handles routing
      wsUrl = `ws://${serverUrl}/session/${sessionId}/jdtls`;
    } else {
      // For localhost/development, use the specific port
      wsUrl = `ws://${serverUrl}:${port}/session/${sessionId}/jdtls`;
    }

    console.log('Java Language Server WebSocket URL:', wsUrl);
    console.log('- ALB endpoint:', isALBEndpoint);

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
                url: wsUrl,
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
  const { config: appConfig } = useConfig();

  useEffect(() => {
    // Build the editor config from app config
    const config: WPILibEditorConfig = {
      serverUrl: appConfig.serverUrl,
      sessionId: appConfig.sessionId,
      port: 30006, // Language server port
    };

    const initializeEditor = async () => {
      if (!containerRef.current || isInitialized.current) return;
      isInitialized.current = true;
      try {
        await initEditor(containerRef.current, wrapper, config);
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

      // Don't dispose the wrapper here since it's a shared instance
      // The wrapper should only be disposed when the entire app is unmounting
      // wrapper.dispose().catch(console.error);
    };
  }, [appConfig.serverUrl, appConfig.sessionId]);

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
