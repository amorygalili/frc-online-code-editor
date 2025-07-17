import React from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
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
import { EditorHeader, BreadcrumbItem } from "./components/EditorHeader";
import { eclipseJdtLsConfig } from "./config.js";
import { EditorBody } from "./EditorApp.tsx";

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
const TEST_SESSION_ID = "test-session-123";

export function TestApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TestEditorWrapper />
    </ThemeProvider>
  );
}

// Custom EditorAppContent for test page that includes close button in header
interface TestEditorAppContentProps {
  breadcrumbs: BreadcrumbItem[];
}

const TestEditorAppContent: React.FC<TestEditorAppContentProps> = ({
  breadcrumbs,
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
      {/* Header with build controls inside BuildProvider context */}
      <EditorHeader
        breadcrumbs={breadcrumbs}
        projectName="RobotProject"
      />
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <EditorBody onFileOpen={handleFileOpen} />
      </Box>
    </Box>
  );
};


const TestEditorWrapper: React.FC = () => {
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

  // Create breadcrumbs for test editor
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "FRC Challenge Editor" }
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ConfigProvider config={testConfig}>
        <NT4Provider>
          <HalSimProvider>
            <EditorProvider>
              <BuildProvider>
                <TestEditorAppContent
                  breadcrumbs={breadcrumbs}
                />
              </BuildProvider>
            </EditorProvider>
          </HalSimProvider>
        </NT4Provider>
      </ConfigProvider>
    </Box>
  );
};

export default TestApp;
