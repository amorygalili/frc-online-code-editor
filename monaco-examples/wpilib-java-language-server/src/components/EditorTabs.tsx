/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState, useCallback } from "react";
import { Box, Tabs, Tab, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import * as vscode from "vscode";

import { useEditor } from "../contexts/EditorContext";
import { createModelReference } from "@codingame/monaco-vscode-api/monaco";

// Re-export OpenFile from context for backward compatibility
export type { OpenFile } from "../contexts/EditorContext";

interface EditorTabsProps {
  onFileClose: (index: number) => void;
  onFileSwitch: (index: number) => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  onFileClose,
  onFileSwitch,
}) => {
  const { openFiles, activeFileIndex, editorWrapper } = useEditor();
  const handleTabChange = useCallback(
    async (_event: React.SyntheticEvent, newValue: number) => {
      if (newValue >= 0 && newValue < openFiles.length) {
        const file = openFiles[newValue];

        try {
          // Switch to the selected file
          const ref = await createModelReference(file.uri);
          editorWrapper.getEditor()?.setModel(ref.object.textEditorModel);

          const doc = await vscode.workspace.openTextDocument(file.uri);
          await vscode.window.showTextDocument(doc, {
            preserveFocus: false,
            preview: false,
            viewColumn: vscode.ViewColumn.Active,
          });

          onFileSwitch(newValue);
        } catch (error) {
          console.error(`Failed to switch to file ${file.path}:`, error);
        }
      }
    },
    [openFiles, onFileSwitch]
  );

  const handleTabClose = useCallback(
    (event: React.MouseEvent, index: number) => {
      event.stopPropagation();
      onFileClose(index);
    },
    [onFileClose]
  );

  if (openFiles.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
        minHeight: 48,
      }}
    >
      <Tabs
        value={
          activeFileIndex >= 0 && activeFileIndex < openFiles.length
            ? activeFileIndex
            : false
        }
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 48,
          "& .MuiTab-root": {
            minHeight: 48,
            textTransform: "none",
            fontSize: "0.875rem",
            fontFamily: "monospace",
            maxWidth: 200,
            minWidth: 120,
          },
        }}
      >
        {openFiles.map((file, index) => (
          <Tab
            key={file.path}
            label={
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    textAlign: "left",
                  }}
                >
                  {file.name}
                  {file.isDirty && " •"}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => handleTabClose(e, index)}
                  sx={{
                    padding: "2px",
                    marginLeft: "4px",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{
              "&.Mui-selected": {
                backgroundColor: "action.selected",
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};
