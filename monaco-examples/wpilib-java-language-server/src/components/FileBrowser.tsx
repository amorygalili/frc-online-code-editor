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
  Toolbar,
  Collapse
} from '@mui/material';
import {
  InsertDriveFile,
  Folder,
  FolderOpen,
  ExpandMore,
  ChevronRight
} from '@mui/icons-material';
import * as vscode from "vscode";
import { FileService, type FileInfo } from '../fileService';
import { eclipseJdtLsConfig } from '../config';
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";
import { useEditor } from '../contexts/EditorContext';

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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
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
      if (expandedNodes.size === 0) {
        // Auto-expand common folders for better UX
        const initialExpanded = new Set<string>();

        // Expand any directory that contains files directly
        const addExpandedDirectories = (nodes: TreeNode[]) => {
          nodes.forEach(node => {
            if (node.type === 'directory' && node.children) {
              const hasFiles = node.children.some(child => child.type === 'file');
              if (hasFiles) {
                initialExpanded.add(node.path);
              }
              addExpandedDirectories(node.children);
            }
          });
        };

        addExpandedDirectories(tree);
        setExpandedNodes(initialExpanded);
      }

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
  }, [buildFileTree, expandedNodes]);

  useEffect(() => {
    // Load files initially with loading spinner
    loadFiles(true);

    // Set up periodic refresh every 5 seconds without loading spinner
    const interval = setInterval(() => loadFiles(false), 5000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [loadFiles]);

  const toggleNodeExpansion = useCallback((nodePath: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodePath)) {
        newSet.delete(nodePath);
      } else {
        newSet.add(nodePath);
      }
      return newSet;
    });
  }, []);

  const handleNodeClick = async (node: TreeNode) => {
    if (node.type === 'directory') {
      toggleNodeExpansion(node.path);
      return;
    }

    // Handle file click - use the stored full path
    if (node.fullPath) {
      const file: FileInfo = {
        name: node.name,
        path: node.fullPath,
        type: 'file'
      };
      await handleFileClick(file);
    } else {
      console.error(`No full path stored for file: ${node.name}`);
    }
  };

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

  // Recursive component to render tree nodes
  const TreeNodeComponent: React.FC<{
    node: TreeNode;
    level: number;
  }> = ({ node, level }) => {
    const isExpanded = expandedNodes.has(node.path);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <>
        <ListItem
          disablePadding
          sx={{ pl: level * 2 }}
        >
          <ListItemButton
            onClick={() => handleNodeClick(node)}
            sx={{
              minHeight: 32,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {node.type === 'directory' ? (
                hasChildren ? (
                  isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />
                ) : (
                  <Folder fontSize="small" />
                )
              ) : (
                <InsertDriveFile fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={node.name}
              slotProps={{
                primary: {
                  variant: 'body2',
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    fontWeight: node.type === 'directory' ? 500 : 400
                  }
                }
              }}
            />
          </ListItemButton>
        </ListItem>

        {node.type === 'directory' && hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {node.children!.map((child, index) => (
                <TreeNodeComponent
                  key={`${child.path}-${index}`}
                  node={child}
                  level={level + 1}
                />
              ))}
            </List>
          </Collapse>
        )}
      </>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Workspace Files
        </Typography>
      </Toolbar>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
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
          <List dense>
            {fileTree.map((node, index) => (
              <TreeNodeComponent
                key={`${node.path}-${index}`}
                node={node}
                level={0}
              />
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};
