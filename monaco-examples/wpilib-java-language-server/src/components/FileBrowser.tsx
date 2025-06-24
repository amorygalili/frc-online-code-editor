/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Toolbar
} from '@mui/material';
import { Close, InsertDriveFile } from '@mui/icons-material';
import * as vscode from "vscode";
import { MonacoEditorLanguageClientWrapper } from 'monaco-editor-wrapper';
import { FileService, type FileInfo } from '../fileService';
import { eclipseJdtLsConfig } from '../config';
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";

interface FileBrowserProps {
  editorWrapper: MonacoEditorLanguageClientWrapper | null;
  onClose: () => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({ editorWrapper, onClose }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    loadFiles();
  }, []);

  const handleFileClick = async (file: FileInfo) => {
    if (!editorWrapper) {
      alert("Editor not initialized");
      return;
    }

    try {
      console.log(`Loading file: ${file.path}`);

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
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Toolbar>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && files.length > 0 && (
          <List dense>
            {files.map((file, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleFileClick(file)}>
                  <ListItemIcon>
                    <InsertDriveFile fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.path}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: { fontFamily: 'monospace' }
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
