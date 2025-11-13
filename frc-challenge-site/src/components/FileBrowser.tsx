/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Toolbar,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import {
  InsertDriveFile,
  Folder,
} from '@mui/icons-material';
import * as vscode from "vscode";
import { FileService, type FileInfo } from '../fileService';
import { eclipseJdtLsConfig } from '../config';
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";
import { useEditor } from '../contexts/EditorContext';
import { ScrollableBox } from './ScrollableBox';

interface TreeNode {
  name: string;
  path: string;
  fullPath?: string; // Store the original full path for files
  type: 'file' | 'directory';
  children?: TreeNode[];
  isExpanded?: boolean;
}

interface FileBrowserProps {
  onClose: () => void;
  onFileOpen?: (filePath: string) => Promise<void>;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({ onFileOpen }) => {
  const { editorWrapper } = useEditor();
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true for initial load
  const [error, setError] = useState<string | null>(null);

  // Function to build tree structure from flat file list, rooted at java/frc/robot
  const buildFileTree = useCallback((files: FileInfo[]): TreeNode[] => {
    const tree: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();
    const robotPathSegment = 'java/frc/robot';

    // Filter files to only include those that contain java/frc/robot in their path
    const robotFiles = files.filter(file =>
      file.path.includes(robotPathSegment)
    );



    // Sort files to ensure directories come before their contents
    const sortedFiles = [...robotFiles].sort((a, b) => {
      const aDepth = a.path.split('/').length;
      const bDepth = b.path.split('/').length;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.path.localeCompare(b.path);
    });

    for (const file of sortedFiles) {
      // Extract the part of the path starting from java/frc/robot
      const robotIndex = file.path.indexOf(robotPathSegment);
      if (robotIndex === -1) continue;

      // Get the path starting from java/frc/robot
      const robotPath = file.path.substring(robotIndex);

      // Remove java/frc/robot/ to get the relative path within the robot package
      let relativePath = robotPath;
      if (robotPath.startsWith(robotPathSegment + '/')) {
        relativePath = robotPath.substring(robotPathSegment.length + 1);
      } else if (robotPath === robotPathSegment) {
        continue; // Skip the root directory itself
      }

      const pathParts = relativePath.split('/');
      let currentPath = '';

      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const isFile = i === pathParts.length - 1 && file.type === 'file';
          const node: TreeNode = {
            name: part,
            path: currentPath,
            fullPath: isFile ? file.path : undefined, // Store original full path for files
            type: isFile ? 'file' : 'directory',
            children: isFile ? undefined : [],
            isExpanded: false
          };

          nodeMap.set(currentPath, node);

          if (parentPath && nodeMap.has(parentPath)) {
            const parentNode = nodeMap.get(parentPath)!;
            if (parentNode.children) {
              parentNode.children.push(node);
            }
          } else if (i === 0) {
            tree.push(node);
          }
        }
      }
    }

    return tree;
  }, []);

  const loadFiles = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log("Loading file list...");
      const javaFiles = await FileService.getJavaFiles();

      // Build tree structure
      const tree = buildFileTree(javaFiles);
      setFileTree(tree);

      // Only set initial expanded state if we don't have any expanded nodes yet
      setExpandedItems(prevExpanded => {
        if (prevExpanded.length === 0) {
          // Auto-expand common folders for better UX
          const initialExpanded: string[] = [];

          // Expand any directory that contains files directly
          const addExpandedDirectories = (nodes: TreeNode[]) => {
            nodes.forEach(node => {
              if (node.type === 'directory' && node.children) {
                const hasFiles = node.children.some(child => child.type === 'file');
                if (hasFiles) {
                  initialExpanded.push(node.path);
                }
                addExpandedDirectories(node.children);
              }
            });
          };

          addExpandedDirectories(tree);
          return initialExpanded;
        }
        return prevExpanded;
      });

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
  }, [buildFileTree]);

  // Separate effect for initial load
  useEffect(() => {
    loadFiles(true);
  }, []); // Empty dependency array - only run on mount

  // Separate effect for periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadFiles(false);
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array - set up once and never recreate

  const handleExpandedItemsChange = useCallback(
    (event: React.SyntheticEvent | null, itemIds: string[]) => {
      setExpandedItems(itemIds);
    },
    []
  );

  const handleItemClick = useCallback(
    async (event: React.SyntheticEvent | null, itemId: string) => {
      // Find the node in the tree
      const findNode = (nodes: TreeNode[], path: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.path === path) {
            return node;
          }
          if (node.children) {
            const found = findNode(node.children, path);
            if (found) return found;
          }
        }
        return null;
      };

      const node = findNode(fileTree, itemId);
      if (!node) return;

      // Only handle file clicks, directories are handled by the tree view
      if (node.type === 'file' && node.fullPath) {
        const file: FileInfo = {
          name: node.name,
          path: node.fullPath,
          type: 'file'
        };
        await handleFileClick(file);
      }
    },
    [fileTree]
  );

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

  // Recursive component to render tree items using MUI X Tree View
  const renderTreeItems = (nodes: TreeNode[]): React.ReactNode => {
    return nodes.map((node) => {
      const icon = node.type === 'directory' ? (
        <Folder sx={{ fontSize: 16 }} />
      ) : (
        <InsertDriveFile sx={{ fontSize: 16 }} />
      );

      return (
        <TreeItem
          key={node.path}
          itemId={node.path}
          label={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 0.25,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                fontWeight: node.type === 'directory' ? 500 : 400,
              }}
            >
              {node.name}
            </Box>
          }
          slots={{
            icon: () => icon,
          }}
          sx={{
            '& .MuiTreeItem-content': {
              minHeight: 28,
              py: 0.25,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            },
            '& .MuiTreeItem-iconContainer': {
              minWidth: 24,
            },
            '& .MuiTreeItem-label': {
              paddingLeft: 0.5,
            },
          }}
        >
          {node.children && node.children.length > 0
            ? renderTreeItems(node.children)
            : null}
        </TreeItem>
      );
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ minHeight: 36, px: 1 }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Files
        </Typography>
      </Toolbar>

      <ScrollableBox sx={{ flex: 1 }}>
        {loading && fileTree.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {fileTree.length > 0 && (
          <SimpleTreeView
            expandedItems={expandedItems}
            onExpandedItemsChange={handleExpandedItemsChange}
            onItemClick={handleItemClick}
            sx={{
              py: 0.5,
              '& .MuiTreeItem-content': {
                borderRadius: 0,
              },
            }}
          >
            {renderTreeItems(fileTree)}
          </SimpleTreeView>
        )}
      </ScrollableBox>
    </Box>
  );
};
