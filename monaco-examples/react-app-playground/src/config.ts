/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { LogLevel } from '@codingame/monaco-vscode-api';
import getEnvironmentServiceOverride from '@codingame/monaco-vscode-environment-service-override';
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override';
import { InMemoryFileSystemProvider, registerFileSystemOverlay, type IFileWriteOptions } from '@codingame/monaco-vscode-files-service-override';
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override';
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override';
import getLocalizationServiceOverride from '@codingame/monaco-vscode-localization-service-override';
import getRemoteAgentServiceOverride from '@codingame/monaco-vscode-remote-agent-service-override';
import getSearchServiceOverride from '@codingame/monaco-vscode-search-service-override';
import getSecretStorageServiceOverride from '@codingame/monaco-vscode-secret-storage-service-override';
import getStorageServiceOverride from '@codingame/monaco-vscode-storage-service-override';
import getBannerServiceOverride from '@codingame/monaco-vscode-view-banner-service-override';
import getStatusBarServiceOverride from '@codingame/monaco-vscode-view-status-bar-service-override';
import getTitleBarServiceOverride from '@codingame/monaco-vscode-view-title-bar-service-override';
import getOutlineServiceOverride from '@codingame/monaco-vscode-outline-service-override';
import * as vscode from 'vscode';

// this is required syntax highlighting
import '@codingame/monaco-vscode-search-result-default-extension';
import '@codingame/monaco-vscode-typescript-basics-default-extension';
import '@codingame/monaco-vscode-typescript-language-features-default-extension';

import type { WrapperConfig } from 'monaco-editor-wrapper';
import { defaultHtmlAugmentationInstructions, defaultViewsInit } from 'monaco-editor-wrapper/vscode/services';
import { configureDefaultWorkerFactory } from 'monaco-editor-wrapper/workers/workerLoaders';
import { createDefaultLocaleConfiguration } from 'monaco-languageclient/vscode/services';
import helloTsCode from './resources/hello.ts?raw';
import testerTsCode from './resources/tester.ts?raw';

export type ConfigResult = {
    wrapperConfig: WrapperConfig
    workspaceFileUri: vscode.Uri;
    helloTsUri: vscode.Uri;
    testerTsUri: vscode.Uri;
};

const createDefaultWorkspaceContent = (workspaceRoot: string) => {
    return JSON.stringify({
        folders: [{
            path: workspaceRoot
        }]
    }, null, 2);
};

export const configure = async (htmlContainer?: HTMLElement): Promise<ConfigResult> => {
    const workspaceFileUri = vscode.Uri.file('/workspace.code-workspace');

    const wrapperConfig: WrapperConfig = {
        $type: 'extended',
        id: 'RAP',
        logLevel: LogLevel.Debug,
        htmlContainer,
        vscodeApiConfig: {
            serviceOverrides: {
                ...getKeybindingsServiceOverride(),
                ...getLifecycleServiceOverride(),
                ...getLocalizationServiceOverride(createDefaultLocaleConfiguration()),
                ...getBannerServiceOverride(),
                ...getStatusBarServiceOverride(),
                ...getTitleBarServiceOverride(),
                ...getExplorerServiceOverride(),
                ...getRemoteAgentServiceOverride(),
                ...getEnvironmentServiceOverride(),
                ...getSecretStorageServiceOverride(),
                ...getStorageServiceOverride(),
                ...getSearchServiceOverride(),
                ...getOutlineServiceOverride()
            },
            enableExtHostWorker: true,
            viewsConfig: {
                viewServiceType: 'ViewsService',
                htmlAugmentationInstructions: defaultHtmlAugmentationInstructions,
                viewsInitFunc: defaultViewsInit
            },
            workspaceConfig: {
                enableWorkspaceTrust: true,
                windowIndicator: {
                    label: 'react-app-playground',
                    tooltip: '',
                    command: ''
                },
                workspaceProvider: {
                    trusted: true,
                    async open() {
                        window.open(window.location.href);
                        return true;
                    },
                    workspace: {
                        workspaceUri: workspaceFileUri
                    }
                },
                configurationDefaults: {
                    'window.title': 'react-app-playground${separator}${dirty}${activeEditorShort}'
                },
                productConfiguration: {
                    nameShort: 'react-app-playground',
                    nameLong: 'react-app-playground'
                }
            },
            userConfiguration: {
                json: JSON.stringify({
                    'workbench.colorTheme': 'Default Dark Modern',
                    'editor.wordBasedSuggestions': 'off',
                    'typescript.tsserver.web.projectWideIntellisense.enabled': true,
                    'typescript.tsserver.web.projectWideIntellisense.suppressSemanticErrors': false,
                    'editor.guides.bracketPairsHorizontal': true,
                    'editor.experimental.asyncTokenization': false
                })
            },
        },
        extensions: [{
            config: {
                name: 'react-app-playground',
                publisher: 'TypeFox',
                version: '1.0.0',
                engines: {
                    vscode: '*'
                }
            }
        }],
        editorAppConfig: {
            monacoWorkerFactory: configureDefaultWorkerFactory
        }
    };

    const helloTsUri = vscode.Uri.file('/workspace/hello.ts');
    const testerTsUri = vscode.Uri.file('/workspace/tester.ts');
    const workspaceUri = vscode.Uri.file('/workspace');

    const fileSystemProvider = new InMemoryFileSystemProvider();
    const textEncoder = new TextEncoder();
    const options: IFileWriteOptions = { create: true, overwrite: true, unlock: true };

    await fileSystemProvider.mkdir(workspaceUri);
    await fileSystemProvider.writeFile(helloTsUri, textEncoder.encode(helloTsCode), options);
    await fileSystemProvider.writeFile(testerTsUri, textEncoder.encode(testerTsCode), options);
    await fileSystemProvider.writeFile(workspaceFileUri, textEncoder.encode(createDefaultWorkspaceContent('/workspace')), options);
    registerFileSystemOverlay(1, fileSystemProvider);

    return {
        wrapperConfig,
        workspaceFileUri,
        helloTsUri,
        testerTsUri
    };
};
