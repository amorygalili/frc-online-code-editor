import React from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Chip,
} from "@mui/material";
import { EditorProvider } from "./contexts/EditorContext";
import { BuildProvider } from "./contexts/BuildContext";
import { NT4Provider } from "./nt4/useNetworktables";
import { HalSimProvider } from "./contexts/HalSimContext";
import { ConfigProvider, AppConfig } from "./contexts/ConfigContext";
import { setFileServiceConfig } from "./fileService";
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
const DOCKER_HOST = "localhost";
const DOCKER_PORT = 30003;
const TEST_SESSION_ID = "test-session-123";

export function TestApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TestEditorWrapper onClose={() => {}} />
    </ThemeProvider>
  );
}

// Custom EditorAppContent for test page that includes close button in header
interface TestEditorAppContentProps {
  onClose: () => void;
}

const TestEditorAppContent: React.FC<TestEditorAppContentProps> = ({
  onClose,
}) => {
  const { openFile } = useEditor();

  const handleFileOpen = useCallback(
    async (filePath: string) => {
      // Convert file path to URI
      const uri = vscode.Uri.file(`${eclipseJdtLsConfig.basePath}/${filePath}`);
      await openFile(uri);
    },
    [openFile]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static" elevation={1} sx={{ minHeight: 48 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, py: 0.5 }}>
          <Typography
            variant="subtitle1"
            component="div"
            sx={{ fontWeight: 600, mr: 2 }}
          >
            FRC Challenge Editor
          </Typography>

          {/* Connection status indicators */}
          <Chip
            label={`${DOCKER_HOST}:${DOCKER_PORT}`}
            size="small"
            variant="outlined"
            sx={{ mr: 1, height: 24, fontSize: "0.75rem" }}
          />

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
            sx={{ ml: 2, minWidth: "auto", px: 1 }}
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
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <WPILibEditorWrapper
                config={{
                  serverUrl: DOCKER_HOST,
                  sessionId: TEST_SESSION_ID,
                  port: 30006,
                }}
              />
            </Box>

            {/* Simulation view */}
            <SimulationView />
          </ResizableSplitter>
        </Box>
      </Box>
    </Box>
  );
};

// Wrapper component that provides the editor with the test configuration
interface TestEditorWrapperProps {
  onClose: () => void;
}

const TestEditorWrapper: React.FC<TestEditorWrapperProps> = ({ onClose }) => {
  // Create test configuration
  const testConfig: AppConfig = {
    serverUrl: DOCKER_HOST,
    sessionId: TEST_SESSION_ID,
  };

  const [initialized, setInitialized] = React.useState(false);

  // Set file service config
  React.useEffect(() => {
    setFileServiceConfig(testConfig);
    setInitialized(true);
  }, [testConfig]);

  if (!initialized) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ConfigProvider config={testConfig}>
        <NT4Provider>
          <HalSimProvider>
            <EditorProvider>
              <BuildProvider>
                <TestEditorAppContent onClose={onClose} />
              </BuildProvider>
            </EditorProvider>
          </HalSimProvider>
        </NT4Provider>
      </ConfigProvider>
    </Box>
  );
};

export default TestApp;
