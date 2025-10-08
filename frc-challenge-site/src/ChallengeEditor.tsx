import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { EditorProvider } from "./contexts/EditorContext";
import { BuildProvider } from "./contexts/BuildContext";
import { NT4Provider } from "./nt4/useNetworktables";
import { HalSimProvider } from "./contexts/HalSimContext";
import { ConfigProvider, AppConfig } from "./contexts/ConfigContext";
import { useCallback } from "react";
import { useEditor } from "./contexts/EditorContext";
import * as vscode from "vscode";
import { EditorHeader, BreadcrumbItem } from "./components/EditorHeader";
import { eclipseJdtLsConfig } from "./config";
import { EditorBody } from "./EditorApp";
import { setFileServiceConfig } from "./fileService";

// Custom EditorAppContent for test page that includes close button in header
interface EditorContentProps {
  breadcrumbs: BreadcrumbItem[];
}

const EditorContent = ({ breadcrumbs }: EditorContentProps) => {
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
      <EditorHeader breadcrumbs={breadcrumbs} projectName="RobotProject" />
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <EditorBody onFileOpen={handleFileOpen} />
      </Box>
    </Box>
  );
};

interface Props {
  serverUrl: string;
  sessionId: string;
  breadcrumbs: BreadcrumbItem[];
}

const ChallengeEditor = ({ serverUrl, sessionId, breadcrumbs }: Props) => {
  // Create test configuration
  const config: AppConfig = {
    serverUrl,
    sessionId,
  };

  const [initialized, setInitialized] = useState(false);

  // Set file service config
  useEffect(() => {
    setFileServiceConfig(config);
    setInitialized(true);
  }, [config]);

  if (!initialized) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ConfigProvider config={config}>
        <NT4Provider>
          <HalSimProvider>
            <EditorProvider>
              <BuildProvider>
                <EditorContent breadcrumbs={breadcrumbs} />
              </BuildProvider>
            </EditorProvider>
          </HalSimProvider>
        </NT4Provider>
      </ConfigProvider>
    </Box>
  );
};

export default ChallengeEditor;
