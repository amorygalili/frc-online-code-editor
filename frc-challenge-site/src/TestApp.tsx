import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { BreadcrumbItem } from "./components/EditorHeader";
import ChallengeEditor from "./ChallengeEditor.tsx";

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
const BREADCRUMBS: BreadcrumbItem[] = [{ label: "FRC Challenge Editor" }];

export function TestApp() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChallengeEditor
        serverUrl={DOCKER_HOST}
        sessionId={TEST_SESSION_ID}
        breadcrumbs={BREADCRUMBS}
      />
    </ThemeProvider>
  );
}

export default TestApp;
