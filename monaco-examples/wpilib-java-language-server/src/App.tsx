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
import * as vscode from "vscode";
import { WPILibEditorWrapper } from "./components/WPILibEditorWrapper.tsx";
import { FileBrowser } from "./components/FileBrowser.tsx";
import { SimulationView } from "./components/SimulationView.tsx";
import { ResizableSplitter } from "./components/ResizableSplitter.tsx";
import { BuildControls } from "./components/BuildControls.tsx";
import { EditorProvider, useEditor } from "./contexts/EditorContext";
import { BuildProvider } from "./contexts/BuildContext.tsx";
import { NT4Provider } from "./nt4/useNetworktables";
import { HalSimProvider } from "./contexts/HalSimContext";
import { eclipseJdtLsConfig } from "./config";
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

const DRAWER_WIDTH = 240; // Reduced from 320 to make more compact

// Main app content that uses the editor context
function AppContent() {
  const { openFiles, openFile, closeFile, setActiveFile } = useEditor();

  const handleFileOpen = useCallback(
    async (filePath: string) => {
      // Convert file path to URI
      const uri = vscode.Uri.file(`${eclipseJdtLsConfig.basePath}/${filePath}`);
      await openFile(uri);
    },
    [openFile]
  );

  const handleFileClose = useCallback(
    (index: number) => {
      if (index >= 0 && index < openFiles.length) {
        const fileToClose = openFiles[index];
        closeFile(fileToClose.uri);
      }
    },
    [openFiles, closeFile]
  );

  const handleFileSwitch = useCallback(
    (index: number) => {
      if (index >= 0 && index < openFiles.length) {
        const fileToSwitch = openFiles[index];
        setActiveFile(fileToSwitch.uri);
      }
    },
    [openFiles, setActiveFile]
  );

  // TODO: Use these handlers in EditorTabs component
  console.log('File handlers available:', { handleFileClose, handleFileSwitch });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppBar position="static" elevation={1} sx={{ minHeight: 48 }}>
          <Toolbar variant="dense" sx={{ minHeight: 48, py: 0.5 }}>
            <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              FRC Simulator
            </Typography>
            <Box sx={{ ml: 1 }}>
              <BuildControls
                projectName="RobotProject" // TODO: Get from current project
              />
            </Box>
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
              overflow: "hidden",
            }}
          >
            <ResizableSplitter
              direction="horizontal"
              initialSizes={[70, 30]} // 70% for editor, 30% for simulation
              minSizes={[400, 300]} // Minimum widths in pixels
            >
              {/* Editor area */}
              <Box
                sx={{
                  height: '100%',
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <WPILibEditorWrapper />
              </Box>

              {/* Simulation view */}
              <SimulationView />
            </ResizableSplitter>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

// Main App component with context providers
function App() {
  return (
    <NT4Provider serverAddress="localhost">
      <HalSimProvider hostname="localhost" port={3300}>
        <EditorProvider>
          <BuildProvider>
            <AppContent />
          </BuildProvider>
        </EditorProvider>
      </HalSimProvider>
    </NT4Provider>
  );
}

export default App;
