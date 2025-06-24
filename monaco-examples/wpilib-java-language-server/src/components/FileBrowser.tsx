/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Toolbar
} from '@mui/material';
import { InsertDriveFile } from '@mui/icons-material';
import * as vscode from "vscode";
import { FileService, type FileInfo } from '../fileService';
import { eclipseJdtLsConfig } from '../config';
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";
import { useEditor } from '../contexts/EditorContext';

interface FileBrowserProps {
  onClose: () => void;
  onFileOpen?: (filePath: string) => Promise<void>;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({ onFileOpen }) => {
  const { editorWrapper } = useEditor();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true for initial load
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log("Loading file list...");
      const javaFiles = await FileService.getJavaFiles();
      setFiles(javaFiles);

      if (javaFiles.length === 0) {
        setError("No Java files found in workspace");
      }
    } catch (err) {
      console.error("Failed to load files:", err);
      setError(`Failed to load files: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (showLoadingSpinner) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Load files initially with loading spinner
    loadFiles(true);

    // Set up periodic refresh every 5 seconds without loading spinner
    const interval = setInterval(() => loadFiles(false), 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [loadFiles]);

  const handleFileClick = async (file: FileInfo) => {
    try {
      console.log(`Loading file: ${file.path}`);

      // Use the onFileOpen prop if available (for tab management)
      if (onFileOpen) {
        await onFileOpen(file.path);
        return;
      }

      // Fallback to the original behavior if no onFileOpen prop
      if (!editorWrapper) {
        alert("Editor not initialized");
        return;
      }

      // Create a unique URI for this file to avoid conflicts
      const uri = vscode.Uri.file(
        `${eclipseJdtLsConfig.basePath}/${file.path}`
      );

      const ref = await createModelReference(uri);
      editorWrapper.getEditor()?.setModel(ref.object.textEditorModel);

      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        preserveFocus: false,
        preview: true,
        viewColumn: vscode.ViewColumn.Active,
      });
    } catch (error) {
      console.error(`Failed to open file ${file.path}:`, error);
      alert(
        `Failed to open file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Workspace Files
        </Typography>
      </Toolbar>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && files.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {files.length > 0 && (
          <List dense>
            {files.map((file, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleFileClick(file)}>
                  <ListItemIcon>
                    <InsertDriveFile fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.path}
                    slotProps={{
                      primary: {
                        variant: 'body2',
                        sx: { fontFamily: 'monospace' }
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};
