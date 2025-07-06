import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Paper,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
} from "@mui/material";
import { EditorAppContent } from './EditorApp';
import { EditorProvider } from './contexts/EditorContext';
import { BuildProvider } from './contexts/BuildContext';
import { NT4Provider } from './nt4/useNetworktables';
import { HalSimProvider } from './contexts/HalSimContext';
import { useCallback } from "react";
import { useEditor } from "./contexts/EditorContext";
import * as vscode from "vscode";
import { WPILibEditorWrapper } from "./components/WPILibEditorWrapper.tsx";
import { FileBrowser } from "./components/FileBrowser.tsx";
import { SimulationView } from "./components/SimulationView.tsx";
import { ResizableSplitter } from "./components/ResizableSplitter.tsx";
import { BuildControls } from "./components/BuildControls.tsx";
import { eclipseJdtLsConfig } from "./config.js";

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

// Fixed configuration for localhost Docker container
const DOCKER_HOST = 'localhost';
const DOCKER_PORT = 30003;
const NT4_PORT = 5810;
const HAL_SIM_PORT = 3300;
const TEST_SESSION_ID = 'test-session-123';

export function TestApp() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not connected');
  const [showEditor, setShowEditor] = useState(false);
  const [useSessionRouting, setUseSessionRouting] = useState(false);

  // Test connection to Docker container
  const testConnection = async () => {
    setConnectionStatus('Testing connection...');
    try {
      const healthUrl = `http://${DOCKER_HOST}:${DOCKER_PORT}/health`;
      const response = await fetch(healthUrl);

      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setConnectionStatus(`Connected to ${data.service || 'Docker container'}`);
      } else {
        setIsConnected(false);
        setConnectionStatus(`Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionStatus(`Connection error: ${(error as Error).message}`);
    }
  };

  // Auto-test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const launchEditor = () => {
    if (isConnected) {
      setShowEditor(true);
    }
  };

  const closeEditor = () => {
    setShowEditor(false);
  };

  if (showEditor) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TestEditorWrapper useSessionRouting={useSessionRouting} onClose={closeEditor} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              WPILib Challenge Editor - Local Docker Test
            </Typography>
            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              variant="outlined"
            />
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, p: 3, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ p: 4, maxWidth: 600, width: '100%' }}>
            <Typography variant="h4" gutterBottom align="center">
              Local Docker Test
            </Typography>

            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
              Testing against localhost:30003 Docker container
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, justifyContent: 'center' }}>
              <Button variant="outlined" onClick={testConnection}>
                Test Connection
              </Button>
              <Typography variant="body2">
                {connectionStatus}
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={useSessionRouting}
                  onChange={(e) => setUseSessionRouting(e.target.checked)}
                />
              }
              label="Enable Session Routing (ALB simulation)"
              sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}
            />

            {isConnected ? (
              <Alert severity="success" sx={{ mb: 3 }}>
                Docker container is accessible. You can launch the editor.
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Docker container is not accessible. Please ensure the container is running.
              </Alert>
            )}

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={launchEditor}
                disabled={!isConnected}
              >
                Launch Challenge Editor
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

// Custom EditorAppContent for test page that includes close button in header
interface TestEditorAppContentProps {
  useSessionRouting: boolean;
  onClose: () => void;
}

const TestEditorAppContent: React.FC<TestEditorAppContentProps> = ({ useSessionRouting, onClose }) => {
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

  const handleTabClick = useCallback(
    (index: number) => {
      if (index >= 0 && index < openFiles.length) {
        setActiveFile(openFiles[index].uri);
      }
    },
    [openFiles, setActiveFile]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static" elevation={1} sx={{ minHeight: 48 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, py: 0.5 }}>
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, mr: 2 }}>
            FRC Challenge Editor
          </Typography>

          {/* Connection status indicators */}
          <Chip
            label={`${DOCKER_HOST}:${DOCKER_PORT}`}
            size="small"
            variant="outlined"
            sx={{ mr: 1, height: 24, fontSize: '0.75rem' }}
          />
          {useSessionRouting && (
            <Chip
              label="Session Routing"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 2, height: 24, fontSize: '0.75rem' }}
            />
          )}

          {/* Spacer to push everything to the right */}
          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ ml: 1 }}>
            <BuildControls
              projectName="RobotProject" // TODO: Get from current project
            />
          </Box>

          {/* Close button */}
          <Button
            color="inherit"
            onClick={onClose}
            size="small"
            sx={{ ml: 2, minWidth: 'auto', px: 1 }}
          >
            Close
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Box sx={{ width: 250, borderRight: 1, borderColor: "divider" }}>
          <FileBrowser onFileOpen={handleFileOpen} onClose={() => {}} />
        </Box>

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
  );
}

// Wrapper component that provides the editor with the test configuration
interface TestEditorWrapperProps {
  useSessionRouting: boolean;
  onClose: () => void;
}

const TestEditorWrapper: React.FC<TestEditorWrapperProps> = ({ useSessionRouting, onClose }) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <NT4Provider
        serverAddress={DOCKER_HOST}
        sessionId={useSessionRouting ? TEST_SESSION_ID : null}
        appName="frc-challenges"
      >
        <HalSimProvider hostname={DOCKER_HOST} port={HAL_SIM_PORT}>
          <EditorProvider>
            <BuildProvider>
              <TestEditorAppContent
                useSessionRouting={useSessionRouting}
                onClose={onClose}
              />
            </BuildProvider>
          </EditorProvider>
        </HalSimProvider>
      </NT4Provider>
    </Box>
  );
};

export default TestApp;
