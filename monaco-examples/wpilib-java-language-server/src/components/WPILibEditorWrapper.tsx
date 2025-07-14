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
import { loadWorkspaceFiles, FileService } from "../fileService";
import type { IStoredWorkspace } from "@codingame/monaco-vscode-configuration-service-override";

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}


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

// Focus management and key event handling by finding Monaco Editor in DOM
function setupEditorFocusAndKeyHandling(container: HTMLDivElement) {
  // Ensure the editor container can receive focus
  container.setAttribute('tabindex', '0');

  // Handle focus events to ensure proper editor focus
  const handleContainerFocus = (e: FocusEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const editorElement = container.querySelector('.monaco-editor .inputarea') as HTMLElement;
    if (editorElement && editorElement.focus) {
      editorElement.focus();
    }
  }


  // Handle key events by finding the Monaco editor and executing commands
  const handleKeyDown = (e: KeyboardEvent) => {
    console.log('Key event:', e.key, 'Ctrl:', e.ctrlKey, 'Shift:', e.shiftKey);

    // Handle Tab key - prevent default browser tab behavior
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();

      
      if (e.shiftKey) {
        Promise.resolve(vscode.commands.executeCommand('editor.action.outdentLines')).catch(console.error);
      } else {
        Promise.resolve(vscode.commands.executeCommand('editor.action.indentLines')).catch(console.error);
      }
      
      return;
    }

    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        Promise.resolve(vscode.commands.executeCommand('undo')).catch(console.error);
        return;
      }

      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        
        Promise.resolve(vscode.commands.executeCommand('redo')).catch(console.error);
        return;
      }
    }

    // Handle Delete and Backspace for selected text
    if (e.key === 'Delete') {
      e.preventDefault();
      e.stopPropagation();

      Promise.resolve(vscode.commands.executeCommand('deleteRight')).catch(console.error);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      Promise.resolve(vscode.commands.executeCommand('deleteLeft')).catch(console.error);
      return;
    }
  };

  // Add event listeners
  container.addEventListener('focus', handleContainerFocus);
  container.addEventListener('keydown', handleKeyDown, true); // Use capture phase

  // Return cleanup function
  return () => {
    container.removeEventListener('focus', handleContainerFocus);
    container.removeEventListener('keydown', handleKeyDown, true);
  };
}

/**
 * Set up automatic file saving to keep the backend file system in sync with editor changes
 */
function setupAutoSave() {
  // Debounced save function to avoid excessive API calls
  const debouncedSave = debounce(async (uri: string, content: string) => {
    try {
      // Extract the relative file path from the URI
      const basePath = eclipseJdtLsConfig.basePath;
      let filePath = uri;

      // Remove the base path prefix if present
      if (filePath.startsWith(basePath)) {
        filePath = filePath.substring(basePath.length);
      }

      // Remove leading slash if present
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }

      console.log(`Auto-saving file: ${filePath}`);
      await FileService.saveFileContent(filePath, content);
      console.log(`Successfully saved: ${filePath}`);
    } catch (error) {
      console.error(`Failed to auto-save file ${uri}:`, error);
    }
  }, 1000); // Save after 1 second of inactivity

  // Listen for document changes in the workspace
  const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
    const document = event.document;

    // Only save Java files to avoid unnecessary saves
    if (document.languageId === 'java' && document.uri.scheme === 'file') {
      const content = document.getText();
      const uri = document.uri.path;

      // Trigger debounced save
      debouncedSave(uri, content);
    }
  });

  // Store the disposable for cleanup (you might want to store this in a ref or context)
  console.log('Auto-save setup complete');

  // Return disposable for cleanup if needed
  return disposable;
}

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

    // Determine if we should use secure WebSocket based on current page protocol
    const isSecure = window.location.protocol === 'https:';
    const wsProtocol = 'wss';

    // Check if serverUrl looks like an ALB or CloudFront domain
    const isALBEndpoint = serverUrl.includes('amazonaws.com') ||
                         serverUrl.includes('elb.amazonaws.com') ||
                         serverUrl.includes('cloudfront.net') ||
                         (!serverUrl.includes('localhost') && !serverUrl.includes('127.0.0.1'));

    let wsUrl: string;
    if (isALBEndpoint) {
      // For ALB endpoints, don't include port - ALB handles routing
      wsUrl = `${wsProtocol}://${serverUrl}/session/${sessionId}/jdtls`;
    } else {
      // For localhost/development, use the specific port
      wsUrl = `${wsProtocol}://${serverUrl}:${port}/session/${sessionId}/jdtls`;
    }

    console.log('Java Language Server WebSocket URL:', wsUrl);
    console.log('- Protocol:', wsProtocol, '(secure:', isSecure, ')');
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
            "editor.tabFocusMode": false,
            "editor.insertSpaces": true,
            "editor.tabSize": 2,
            "editor.detectIndentation": true,
            "editor.useTabStops": true,
            "editor.multiCursorModifier": "ctrlCmd",
            "editor.selectionHighlight": true,
            "editor.find.autoFindInSelection": "never",
            "editor.find.seedSearchStringFromSelection": "always",
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

    // Set up automatic file saving to keep backend in sync with editor changes
    // const disposable = setupAutoSave(wrapper);
    setupAutoSave();

    // Focus the editor initially
    setTimeout(() => {
      Promise.resolve(vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')).catch(console.error);
    }, 100);

    // return disposable;

  } catch (error) {
    console.error("Failed to initialize editor:", error);
  }
}

export const WPILibEditorWrapper = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const autoSaveDisposable = useRef<vscode.Disposable | null>(null);
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
        // const disposable = await initEditor(containerRef.current, wrapper, config);
        // autoSaveDisposable.current = disposable || null;
      } catch (error) {
        console.error("Failed to initialize editor:", error);
      }
    };

    let cleanupFocusHandling = () => {};

    initializeEditor().then(() => {
       if (containerRef.current) {
         cleanupFocusHandling = setupEditorFocusAndKeyHandling(containerRef.current);
       }
    });

    // Cleanup function
    return () => {
      cleanupFocusHandling();

      // // Clean up auto-save listener
      // if (autoSaveDisposable.current) {
      //   autoSaveDisposable.current.dispose();
      //   autoSaveDisposable.current = null;
      // }

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
  }, []);

  return (
    <div
      ref={containerRef}
      className="monaco-editor-container"
      tabIndex={0}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        maxHeight: "100%",
        overflow: "hidden",
        outline: "none", // Remove focus outline since Monaco handles its own focus styling
      }}
    />
  );
});
