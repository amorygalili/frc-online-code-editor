/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import { RegisteredFileSystemProvider, RegisteredMemoryFile, registerFileSystemOverlay } from '@codingame/monaco-vscode-files-service-override';
// this is required syntax highlighting
import '@codingame/monaco-vscode-java-default-extension';
import { LogLevel } from '@codingame/monaco-vscode-api';
import { MonacoEditorLanguageClientWrapper, type WrapperConfig } from 'monaco-editor-wrapper';
import { configureDefaultWorkerFactory } from 'monaco-editor-wrapper/workers/workerLoaders';
import { eclipseJdtLsConfig } from './config.js';
import helloJavaCode from './hello.java?raw';
import { FileService } from './fileService.js';

/**
 * Load files from the workspace and register them with the file system provider
 */
async function loadWorkspaceFiles(fileSystemProvider: RegisteredFileSystemProvider): Promise<string[]> {
    try {
        // Check if file service is available
        const isAvailable = await FileService.isAvailable();
        if (!isAvailable) {
            console.warn('File service not available, using fallback hello.java');
            return [];
        }

        // Get all Java files from the workspace
        const javaFiles = await FileService.getJavaFiles();
        const loadedFiles: string[] = [];

        for (const fileInfo of javaFiles) {
            try {
                const content = await FileService.getFileContent(fileInfo.path);
                const uri = vscode.Uri.file(`${eclipseJdtLsConfig.basePath}/${fileInfo.path}`);

                // Only register if not already registered to avoid conflicts
                try {
                    fileSystemProvider.registerFile(new RegisteredMemoryFile(uri, content));
                    loadedFiles.push(fileInfo.path);
                    console.log(`Loaded file: ${fileInfo.path}`, uri);
                } catch (registerError) {
                    // File might already be registered, just add to loaded files
                    console.log(`File ${fileInfo.path} already registered or conflict, skipping registration`);
                    loadedFiles.push(fileInfo.path);
                }
            } catch (error) {
                console.error(`Failed to load file ${fileInfo.path}:`, error);
            }
        }

        return loadedFiles;
    } catch (error) {
        console.error('Failed to load workspace files:', error);
        return [];
    }
}

export const runEclipseJdtLsClient = () => {
    const fileSystemProvider = new RegisteredFileSystemProvider(false);
    registerFileSystemOverlay(1, fileSystemProvider);

    const wrapperConfig: WrapperConfig = {
        $type: 'extended',
        htmlContainer: document.getElementById('monaco-editor-root')!,
        logLevel: LogLevel.Debug,
        vscodeApiConfig: {
            serviceOverrides: {
                ...getKeybindingsServiceOverride(),
            },
            userConfiguration: {
                json: JSON.stringify({
                    'workbench.colorTheme': 'Default Dark Modern',
                    'editor.guides.bracketPairsHorizontal': 'active',
                    'editor.wordBasedSuggestions': 'off',
                    'editor.experimental.asyncTokenization': true
                })
            }
        },
        editorAppConfig: {
            codeResources: {
                modified: {
                    text: helloJavaCode,
                    uri: `${eclipseJdtLsConfig.basePath}/hello.java`
                }
            },
            monacoWorkerFactory: configureDefaultWorkerFactory
        },
        languageClientConfigs: {
            configs: {
                java: {
                    connection: {
                        options: {
                            $type: 'WebSocketUrl',
                            url: 'ws://localhost:30003/jdtls'
                        }
                    },
                    clientOptions: {
                        documentSelector: ['java'],
                        workspaceFolder: {
                            index: 0,
                            name: 'workspace',
                            uri: vscode.Uri.parse(`${eclipseJdtLsConfig.basePath}`)
                        }
                    }
                }
            }
        }
    };

    const wrapper = new MonacoEditorLanguageClientWrapper();

    try {
        document.querySelector('#button-start')?.addEventListener('click', async () => {
            await wrapper.init(wrapperConfig);
            await wrapper.start();
            console.log("Language server started...");

            loadWorkspaceFiles(fileSystemProvider);
        });
        document.querySelector('#button-dispose')?.addEventListener('click', async () => {
            await wrapper.dispose();
        });

        document.querySelector('#button-browse-files')?.addEventListener('click', async () => {
            try {
                const fileBrowser = document.getElementById('file-browser');
                const fileList = document.getElementById('file-list');

                if (!fileBrowser || !fileList) return;

                // Toggle visibility
                if (fileBrowser.style.display === 'none') {
                    console.log("Loading file list...");

                    // Clear existing list
                    fileList.innerHTML = '';

                    // Load files
                    const javaFiles = await FileService.getJavaFiles();

                    if (javaFiles.length === 0) {
                        fileList.innerHTML = '<li>No Java files found in workspace</li>';
                    } else {
                        javaFiles.forEach(file => {
                            const li = document.createElement('li');
                            li.style.cursor = 'pointer';
                            li.style.padding = '2px 0';
                            li.textContent = file.path;

                            li.addEventListener('click', async () => {
                                try {
                                    console.log(`Loading file: ${file.path}`);

                                    // Get the content from our file service
                                    const content = await FileService.getFileContent(file.path);

                                    // Create a unique URI for this file to avoid conflicts
                                    const uri = vscode.Uri.file(`${eclipseJdtLsConfig.basePath}/${file.path}`);

                                    // Try to open the document directly - if it exists in the LSP workspace, it should work
                                    try {
                                        await vscode.window.showTextDocument(uri);
                                        console.log(`Opened existing workspace file: ${file.path}`);
                                    } catch (openError) {
                                        // If the file doesn't exist in the LSP workspace, register it in Monaco
                                        console.log(`File not in LSP workspace, registering in Monaco: ${file.path}`);
                                        // fileSystemProvider.registerFile(new RegisteredMemoryFile(uri, content));
                                        await vscode.window.showTextDocument(uri);
                                        console.log(`Opened registered file: ${file.path}`);
                                    }
                                } catch (error) {
                                    console.error(`Failed to open file ${file.path}:`, error);
                                    alert(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
                                }
                            });

                            fileList.appendChild(li);
                        });
                    }

                    fileBrowser.style.display = 'block';
                } else {
                    fileBrowser.style.display = 'none';
                }
            } catch (error) {
                console.error('Failed to browse files:', error);
                alert(`Failed to browse files: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    } catch (e) {
        console.error(e);
    }
};
