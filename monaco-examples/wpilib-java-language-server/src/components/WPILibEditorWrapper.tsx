/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useEffect, useRef } from 'react';
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

interface WPILibEditorWrapperProps {
  onLoad?: (wrapper: MonacoEditorLanguageClientWrapper) => void;
  onError?: (error: Error) => void;
}

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

export const WPILibEditorWrapper: React.FC<WPILibEditorWrapperProps> = ({ 
  onLoad, 
  onError 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<MonacoEditorLanguageClientWrapper | null>(null);

  useEffect(() => {
    const initializeEditor = async () => {
      if (!containerRef.current) return;

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
          htmlContainer: containerRef.current,
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

        const wrapper = new MonacoEditorLanguageClientWrapper();
        await wrapper.init(wrapperConfig);
        
        wrapperRef.current = wrapper;
        
        if (onLoad) {
          onLoad(wrapper);
        }
      } catch (error) {
        console.error("Failed to initialize editor:", error);
        if (onError) {
          onError(error as Error);
        }
      }
    };

    initializeEditor();

    // Cleanup function
    return () => {
      if (wrapperRef.current) {
        wrapperRef.current.dispose().catch(console.error);
      }
    };
  }, [onLoad, onError]);

  return (
    <div
      ref={containerRef}
      className="monaco-editor-container"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        maxHeight: '100%',
        border: '1px solid #ccc',
        overflow: 'hidden'
      }}
    />
  );
};
