/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RegisteredFileSystemProvider, RegisteredMemoryFile } from "@codingame/monaco-vscode-files-service-override";
import { eclipseJdtLsConfig } from "./config";
import * as vscode from "vscode";

/**
 * Service for interacting with the file server API
 */

import { AppConfig, buildSessionUrl } from './contexts/ConfigContext';

// Global config reference - will be set by the ConfigProvider
let globalConfig: AppConfig | null = null;

// Set the global config (called by ConfigProvider)
export function setFileServiceConfig(config: AppConfig) {
  globalConfig = config;
}

// Helper function to build session-aware URLs
function buildFileServiceUrl(endpoint: string): string {
  if (!globalConfig) {
    throw new Error("FileServiceConfig not set");
  }
  return buildSessionUrl(globalConfig, endpoint, 30003);
}

export interface FileInfo {
    name: string;
    type: 'file' | 'directory';
    path: string;
}

export interface DirectoryListing {
    path: string;
    files: FileInfo[];
}

export interface FileContent {
    path: string;
    content: string;
}

export interface WPILibProject {
    name: string;
    path: string;
    teamNumber: number;
    projectYear: string;
    language: string;
    classpath?: string[];
}

export interface ProjectGenerationOptions {
    name: string;
    teamNumber?: number;
    packageName?: string;
}

export interface ProjectGenerationResult {
    success: boolean;
    projectName?: string;
    projectPath?: string;
    teamNumber?: number;
    packageName?: string;
    message: string;
    error?: string;
}

export class FileService {
    /**
     * Get the content of a file
     */
    static async getFileContent(filePath: string): Promise<string> {
        const url = buildFileServiceUrl(`/files/${filePath}`);
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to get file content: ${error.error || response.statusText}`);
        }

        const data: FileContent = await response.json();
        return data.content;
    }

    /**
     * Save content to a file
     */
    static async saveFileContent(filePath: string, content: string): Promise<void> {
        const url = buildFileServiceUrl(`/files/${filePath}`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to save file: ${error.error || response.statusText}`);
        }
    }

    /**
     * List files and directories in a path
     */
    static async listDirectory(dirPath: string = ''): Promise<DirectoryListing> {
        const baseUrl = buildFileServiceUrl('/files');
        const url = new URL(baseUrl);
        if (dirPath) {
            url.searchParams.set('path', dirPath);
        }
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to list directory: ${error.error || response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Get all Java files in the workspace recursively
     */
    static async getJavaFiles(): Promise<FileInfo[]> {
        const url = buildFileServiceUrl('/java-files');
        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to get Java files: ${error.error || response.statusText}`);
        }

        const data = await response.json();
        return data.files || [];
    }

    /**
     * Check if the file server is available
     */
    static async isAvailable(): Promise<boolean> {
        try {
            const url = buildFileServiceUrl('/health');
            const response = await fetch(url);
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Generate a new WPILib robot project
     */
    static async generateWPILibProject(options: ProjectGenerationOptions): Promise<ProjectGenerationResult> {
        try {
            const url = buildFileServiceUrl('/wpilib/generate-project');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to generate project: ${error.error || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            return {
                success: false,
                message: `Failed to generate WPILib project: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * List all WPILib robot projects in the workspace
     */
    static async listWPILibProjects(): Promise<WPILibProject[]> {
        try {
            const url = buildFileServiceUrl('/wpilib/projects');
            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Failed to list projects: ${error.error || response.statusText}`);
            }

            const data = await response.json();
            return data.projects || [];
        } catch (error) {
            console.error('Failed to list WPILib projects:', error);
            return [];
        }
    }

    /**
     * Get information about a specific WPILib project
     */
    static async getWPILibProjectInfo(projectName: string): Promise<WPILibProject | null> {
        try {
            const url = buildFileServiceUrl(`/wpilib/projects/${projectName}`);
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                const error = await response.json();
                throw new Error(`Failed to get project info: ${error.error || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Failed to get WPILib project info for ${projectName}:`, error);
            return null;
        }
    }
}




/**
 * Load files from the workspace and register them with the file system provider
 */
export async function loadWorkspaceFiles(
  fileSystemProvider: RegisteredFileSystemProvider
): Promise<string[]> {
  try {
    // Check if file service is available
    const isAvailable = await FileService.isAvailable();
    if (!isAvailable) {
      console.warn("File service not available, using fallback hello.java");
      return [];
    }

    // Get all Java files from the workspace
    console.log("loadWorkspaceFiles");
    const javaFiles = await FileService.getJavaFiles();
    const loadedFiles: string[] = [];

    for (const fileInfo of javaFiles) {
      try {
        const content = await FileService.getFileContent(fileInfo.path);
        const uri = vscode.Uri.file(
          `${eclipseJdtLsConfig.basePath}/${fileInfo.path}`
        );

        // Only register if not already registered to avoid conflicts
        try {
          fileSystemProvider.registerFile(
            new RegisteredMemoryFile(uri, content)
          );
          loadedFiles.push(fileInfo.path);
          console.log(`Loaded file: ${fileInfo.path}`, uri);
        } catch (registerError) {
          // File might already be registered, just add to loaded files
          console.log(
            `File ${fileInfo.path} already registered or conflict, skipping registration`
          );
          loadedFiles.push(fileInfo.path);
        }
      } catch (error) {
        console.error(`Failed to load file ${fileInfo.path}:`, error);
      }
    }

    return loadedFiles;
  } catch (error) {
    console.error("Failed to load workspace files:", error);
    return [];
  }
}