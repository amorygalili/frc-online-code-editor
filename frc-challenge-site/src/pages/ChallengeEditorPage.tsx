import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { EditorProvider } from "../contexts/EditorContext";
import { BuildProvider } from "../contexts/BuildContext";
import { SessionProvider } from "../contexts/SessionContext";
import { EditorBody } from "../EditorApp";
import { useEditor } from "../contexts/EditorContext";
import { useCallback } from "react";
import * as vscode from "vscode";
import { eclipseJdtLsConfig } from "../config";
import { EditorHeader, BreadcrumbItem } from "../components/EditorHeader";
import { ConfigProvider, AppConfig } from "../contexts/ConfigContext";
import { setFileServiceConfig } from "../fileService";
import { sessionService } from "../services/sessionService";
import {
  challengeService,
  Challenge,
  ChallengeSession,
} from "../services/challengeService";
import { useAuth } from "../contexts/AuthContext";
import { NT4Provider } from "../nt4/useNetworktables";
import { HalSimProvider } from "../contexts/HalSimContext";

// Icons
const BackIcon = () => <span>←</span>;

interface ChallengeEditorPageProps {}

export const ChallengeEditorPage: React.FC<ChallengeEditorPageProps> = () => {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [session, setSession] = useState<ChallengeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    "creating" | "connecting" | "ready" | "failed"
  >("creating");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Load challenge data and create/connect to session
  useEffect(() => {
    if (!challengeId || !isAuthenticated) return;

    const initializeSession = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load challenge details
        console.log(`Loading challenge ${challengeId}`);
        const challengeData = await challengeService.getChallenge(challengeId);
        if (!challengeData) {
          throw new Error("Challenge not found");
        }
        setChallenge(challengeData);

        // Check if session creation is already in progress
        if (sessionService.isCreating()) {
          console.log("Session creation already in progress, waiting...");
          setSessionStatus("creating");
        }

        // Check for existing active session first (using improved method)
        console.log("Checking for existing active session...");
        const activeSession = await sessionService.getCurrentActiveSession();

        if (activeSession) {
          console.log(
            "Found existing active session:",
            activeSession.sessionId
          );
          console.log("Reusing session for challenge:", challengeId);
          console.log('Existing session data:', activeSession);
          console.log('Existing container info:', activeSession.containerInfo);
          console.log('Existing ALB endpoints:', activeSession.containerInfo?.albEndpoints);

          // Update session to track current challenge (locally)
          const updatedSession = { ...activeSession, challengeId };
          setSession(updatedSession);

          if (activeSession.status === "running") {
            setSessionStatus("ready");
            setLoading(false);
            return;
          }
        }

        // Create new session (with built-in deduplication and promise reuse)
        if (!sessionService.isCreating()) {
          setSessionStatus("creating");
        }
        console.log(
          `Creating session for challenge ${challengeId}`
        );
        const sessionData = await sessionService.createSession(challengeId);
        console.log('Session data received:', sessionData);
        console.log('Container info:', sessionData.containerInfo);
        console.log('ALB endpoints:', sessionData.containerInfo?.albEndpoints);
        setSession(sessionData);

        // Check if session is already ready
        if (sessionData.status === "running") {
          setSessionStatus("ready");
          console.log(`Session ${sessionData.sessionId} is ready`);
        } else {
          // Wait for session to be ready
          setSessionStatus("connecting");
          console.log(
            `Waiting for session ${sessionData.sessionId} to be ready`
          );

          // The sessionService.createSession already waits for readiness
          setSessionStatus("ready");
          console.log(`Session ${sessionData.sessionId} is ready`);
        }
      } catch (err) {
        console.error("Failed to initialize session:", err);
        let errorMessage = "Failed to start challenge session";

        if (err instanceof Error) {
          if (err.message.includes("timeout")) {
            errorMessage =
              "Session startup timed out. The container may be taking longer than expected to start. Please try again.";
          } else if (err.message.includes("Cannot create new session")) {
            errorMessage = err.message;
          } else {
            errorMessage = err.message;
          }
        }

        setError(errorMessage);
        setSessionStatus("failed");
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [challengeId, isAuthenticated]);


  const handleBackToChallenge = () => {
    navigate(`/challenge/${challengeId}`);
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          {sessionStatus === "creating" && "Setting up challenge session..."}
          {sessionStatus === "connecting" &&
            "Starting container (this may take a few minutes)..."}
          {sessionStatus === "ready" && "Loading editor..."}
        </Typography>
        {sessionStatus === "connecting" && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", maxWidth: 400 }}
          >
            The container is starting up with WPILib and all dependencies. This
            typically takes 2-3 minutes for the first launch.
          </Typography>
        )}
        {challenge && (
          <Typography variant="body2" color="text.secondary">
            {challenge.title}
          </Typography>
        )}
      </Box>
    );
  }

  // Error state
  if (error || sessionStatus === "failed") {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Failed to start challenge session"}
        </Alert>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setError(null);
              setSessionStatus("creating");
              // Retry initialization
              if (challengeId && isAuthenticated) {
                const initializeSession = async () => {
                  try {
                    setLoading(true);

                    // Check if session creation is already in progress
                    if (!sessionService.isCreating()) {
                      setSessionStatus("creating");
                    }

                    const sessionData = await sessionService.createSession(
                      challengeId
                    );
                    setSession(sessionData);
                    setSessionStatus("ready");
                  } catch (err) {
                    console.error("Retry failed:", err);
                    setError(
                      err instanceof Error ? err.message : "Retry failed"
                    );
                    setSessionStatus("failed");
                  } finally {
                    setLoading(false);
                  }
                };
                initializeSession();
              }
            }}
          >
            🔄 Retry
          </Button>
          <Button variant="outlined" onClick={handleBackToChallenge}>
            <BackIcon /> Back to Challenge
          </Button>
        </Box>
      </Box>
    );
  }

  // Session not ready
  if (!session || !challenge || sessionStatus !== "ready") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Create breadcrumbs for challenge editor
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Challenges" },
    { label: challenge.title, onClick: handleBackToChallenge },
    { label: "Editor" }
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <SessionAwareEditorApp
        session={session}
        challenge={challenge}
        breadcrumbs={breadcrumbs}
      />
    </Box>
  );
};

// Wrapper component that configures EditorApp with session data
interface SessionAwareEditorAppProps {
  session: ChallengeSession;
  challenge: Challenge;
  breadcrumbs: BreadcrumbItem[];
}

const SessionAwareEditorApp: React.FC<SessionAwareEditorAppProps> = ({
  session,
  challenge,
  breadcrumbs,
}) => {
  // Create config from session data
  // Extract server URL from ALB endpoints or fall back to localhost for development
  const albMainUrl = session.containerInfo?.albEndpoints?.main;
  let serverUrl: string;

  if (!albMainUrl) {
    return null;
  }

  try {
    const url = new URL(albMainUrl);
    serverUrl = url.hostname;
    console.log('✅ Using ALB endpoint for session configuration:', serverUrl);
    console.log('Full ALB main URL:', albMainUrl);
  } catch (error) {
    console.warn('Invalid ALB URL:', albMainUrl, error);
    return null;
  }

  const editorConfig: AppConfig = {
    serverUrl,
    sessionId: session.sessionId,
  };

  const [initialized, setInitialized] = React.useState(false);

  console.log('Editor configuration:', editorConfig);

  // Set global config for FileService
  React.useEffect(() => {
    setFileServiceConfig(editorConfig);
    setInitialized(true);
  }, [editorConfig]);

  if (!initialized) {
    return null;
  }

  return (
    <SessionProvider initialSession={session} initialChallenge={challenge}>
      <ConfigProvider config={editorConfig}>
        <NT4Provider>
          <HalSimProvider>
            <EditorProvider>
              <BuildProvider>
                <ChallengeEditorContent
                  breadcrumbs={breadcrumbs}
                />
              </BuildProvider>
            </EditorProvider>
          </HalSimProvider>
        </NT4Provider>
      </ConfigProvider>
    </SessionProvider>
  );
};

// Challenge editor content component that uses EditorContentWithoutHeader
interface ChallengeEditorContentProps {
  breadcrumbs: BreadcrumbItem[];
}

function ChallengeEditorContent({ breadcrumbs }: ChallengeEditorContentProps) {
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
      <EditorHeader
        breadcrumbs={breadcrumbs}
        projectName="RobotProject"
      />
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <EditorBody onFileOpen={handleFileOpen} />
      </Box>
    </Box>
  );
}

export default ChallengeEditorPage;
