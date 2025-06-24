/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { useCallback } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
} from "@mui/material";
import { WPILibEditorWrapper } from "./components/WPILibEditorWrapper.tsx";
import { FileBrowser } from "./components/FileBrowser.tsx";
import { EditorTabs } from "./components/EditorTabs.tsx";
import { EditorProvider, useEditor } from "./contexts/EditorContext";
import "./App.css";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

const DRAWER_WIDTH = 320;

// Main app content that uses the editor context
function AppContent() {
  const { openFiles, openFile, closeFile, setActiveFile } = useEditor();

  const handleFileOpen = useCallback(
    async (filePath: string) => {
      await openFile(filePath);
    },
    [openFile]
  );

  const handleFileClose = useCallback(
    (index: number) => {
      if (index >= 0 && index < openFiles.length) {
        const fileToClose = openFiles[index];
        closeFile(fileToClose.path);
      }
    },
    [openFiles, closeFile]
  );

  const handleFileSwitch = useCallback(
    (index: number) => {
      if (index >= 0 && index < openFiles.length) {
        const fileToSwitch = openFiles[index];
        setActiveFile(fileToSwitch.path);
      }
    },
    [openFiles, setActiveFile]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              WPILib Java Language Client & Language Server
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Drawer
            variant="persistent"
            anchor="left"
            open={true}
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: DRAWER_WIDTH,
                boxSizing: "border-box",
                position: "relative",
              },
            }}
          >
            <FileBrowser onClose={() => {}} onFileOpen={handleFileOpen} />
          </Drawer>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <EditorTabs
              onFileClose={handleFileClose}
              onFileSwitch={handleFileSwitch}
            />
            <WPILibEditorWrapper />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

// Main App component with context provider
function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}

export default App;
