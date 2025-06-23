/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

/**
 * Service for interacting with the file server API
 */

const FILE_SERVER_BASE_URL = 'http://localhost:30003';

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

export class FileService {
    /**
     * Get the content of a file
     */
    static async getFileContent(filePath: string): Promise<string> {
        const response = await fetch(`${FILE_SERVER_BASE_URL}/files/${filePath}`);
        
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
        const response = await fetch(`${FILE_SERVER_BASE_URL}/files/${filePath}`, {
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
        const url = new URL(`${FILE_SERVER_BASE_URL}/files`);
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
    static async getJavaFiles(dirPath: string = ''): Promise<FileInfo[]> {
        const listing = await this.listDirectory(dirPath);
        const javaFiles: FileInfo[] = [];
        
        for (const file of listing.files) {
            if (file.type === 'file' && file.name.endsWith('.java')) {
                javaFiles.push(file);
            } else if (file.type === 'directory') {
                // Recursively get Java files from subdirectories
                const subFiles = await this.getJavaFiles(file.path);
                javaFiles.push(...subFiles);
            }
        }
        
        return javaFiles;
    }

    /**
     * Check if the file server is available
     */
    static async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${FILE_SERVER_BASE_URL}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
