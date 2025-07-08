import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { EditorProvider } from "../contexts/EditorContext";
import { BuildProvider } from "../contexts/BuildContext";
import { SessionProvider } from "../contexts/SessionContext";
import { SessionAwareProviders } from "../contexts/SessionAwareProviders";
import { EditorAppContent } from "../EditorApp";
import { ConfigProvider, AppConfig } from "../contexts/ConfigContext";
import { setFileServiceConfig } from "../fileService";
import { sessionService } from "../services/sessionService";
import {
  challengeService,
  Challenge,
  ChallengeSession,
} from "../services/challengeService";
import { useAuth } from "../contexts/AuthContext";

// Icons
const BackIcon = () => <span>←</span>;
const ExitIcon = () => <span>🚪</span>;

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

        // Check for existing sessions first (any active session can be reused)
        console.log("Checking for existing sessions...");
        const existingSessions = await sessionService.listSessions();
        const activeSession = existingSessions.find(
          (s) => s.status === "running" || s.status === "starting"
        );

        if (activeSession) {
          console.log(
            "Found existing active session:",
            activeSession.sessionId
          );
          console.log("Reusing session for challenge:", challengeId);

          // Update session to track current challenge (locally)
          const updatedSession = { ...activeSession, challengeId };
          setSession(updatedSession);

          if (activeSession.status === "running") {
            setSessionStatus("ready");
            setLoading(false);
            return;
          }
        }

        // Create or connect to existing session
        setSessionStatus("creating");
        console.log(
          `Creating/connecting to session for challenge ${challengeId}`
        );
        const sessionData = await sessionService.createSession(challengeId);
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

  // Handle session cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't automatically terminate sessions on unmount
      // Sessions are designed to persist and be reused
      // Users can explicitly exit via the exit button
    };
  }, []);

  const handleExitSession = async () => {
    if (!session) return;

    try {
      // Note: For now we just navigate back without terminating the session
      // The session will remain active for reuse or timeout naturally
      navigate(`/challenge/${challengeId}`);
    } catch (err) {
      console.error("Error exiting session:", err);
      // Navigate anyway
      navigate(`/challenge/${challengeId}`);
    }
  };

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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Custom header for challenge editor */}
      <AppBar position="static" elevation={1} sx={{ minHeight: 48 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, py: 0.5 }}>
          {/* Breadcrumbs */}
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs sx={{ color: "inherit" }}>
              <Link
                component="button"
                variant="body2"
                onClick={handleBackToChallenge}
                sx={{ color: "inherit", textDecoration: "none" }}
              >
                {challenge.title}
              </Link>
              <Typography variant="body2" sx={{ color: "inherit" }}>
                Editor
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Session info */}
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            Container: {session.sessionId.slice(0, 8)}...
          </Typography>

          {/* Exit button */}
          <Button
            color="inherit"
            size="small"
            onClick={handleExitSession}
            sx={{ minWidth: "auto" }}
          >
            <ExitIcon /> Exit
          </Button>
        </Toolbar>
      </AppBar>

      {/* Editor content */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <SessionAwareEditorApp session={session} challenge={challenge} />
      </Box>
    </Box>
  );
};

// Wrapper component that configures EditorApp with session data
interface SessionAwareEditorAppProps {
  session: ChallengeSession;
  challenge: Challenge;
}

const SessionAwareEditorApp: React.FC<SessionAwareEditorAppProps> = ({
  session,
  challenge,
}) => {
  // Create config from session data
  // Extract server URL from ALB endpoints or fall back to localhost for development
  const albMainUrl = session.containerInfo?.albEndpoints?.main;
  const serverUrl = albMainUrl ? new URL(albMainUrl).hostname : "localhost";

  const editorConfig: AppConfig = {
    serverUrl,
    sessionId: session.sessionId,
  };

  // Set global config for FileService
  React.useEffect(() => {
    setFileServiceConfig(editorConfig);
  }, [editorConfig]);

  return (
    <SessionProvider initialSession={session} initialChallenge={challenge}>
      <ConfigProvider config={editorConfig}>
        <SessionAwareProviders session={session}>
          <EditorProvider>
            <BuildProvider>
              <EditorAppContent />
            </BuildProvider>
          </EditorProvider>
        </SessionAwareProviders>
      </ConfigProvider>
    </SessionProvider>
  );
};

export default ChallengeEditorPage;
