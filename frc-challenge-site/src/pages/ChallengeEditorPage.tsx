import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { SessionProvider, useSession } from "../contexts/SessionContext";
import { BreadcrumbItem } from "../components/EditorHeader";
import { setFileServiceConfig } from "../fileService";
import { useAuth } from "../contexts/AuthContext";
import ChallengeEditor from "../ChallengeEditor";

// Icons
const BackIcon = () => <span>←</span>;

// Main page component - wraps content with SessionProvider
export const ChallengeEditorPage = () => {
  const { id: challengeId } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !challengeId) {
    return null;
  }

  return (
    <SessionProvider challengeId={challengeId}>
      <ChallengeEditorContent />
    </SessionProvider>
  );
};

// Inner component that uses SessionContext
const ChallengeEditorContent = () => {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    session,
    challenge,
    status,
    error,
    clearError,
    initializeSession,
    getServerUrl
  } = useSession();

  const handleBackToChallenge = () => {
    navigate(`/challenge/${challengeId}`);
  };

  const handleRetry = () => {
    clearError();
    if (challengeId) {
      initializeSession(challengeId);
    }
  };

  // Loading states
  if (status === 'idle' || status === 'loading' || status === 'creating' || status === 'connecting') {
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
          {(status === 'idle' || status === 'loading') && "Loading challenge..."}
          {status === 'creating' && "Setting up challenge session..."}
          {status === 'connecting' && "Starting container (this may take a few minutes)..."}
        </Typography>
        {status === 'connecting' && (
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
            {challenge.metadata?.title}
          </Typography>
        )}
      </Box>
    );
  }

  // Error state
  if (status === 'failed' || error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Failed to start challenge session"}
        </Alert>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" onClick={handleRetry}>
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
  if (!session || !challenge || status !== 'ready') {
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

  // Get server URL
  const serverUrl = getServerUrl();
  if (!serverUrl) {
    console.error("No server URL available from session");
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to get container endpoint from session
        </Alert>
        <Button variant="outlined" onClick={handleBackToChallenge}>
          <BackIcon /> Back to Challenge
        </Button>
      </Box>
    );
  }

  // Create breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Challenges" },
    { label: challenge.metadata?.title || "Challenge", onClick: handleBackToChallenge },
    { label: "Editor" },
  ];

  return (
    <EditorWrapper
      serverUrl={serverUrl}
      sessionId={session.sessionId}
      breadcrumbs={breadcrumbs}
    />
  );
};

// Wrapper component that sets up FileService config and renders editor
interface EditorWrapperProps {
  serverUrl: string;
  sessionId: string;
  breadcrumbs: BreadcrumbItem[];
}

const EditorWrapper: React.FC<EditorWrapperProps> = ({
  serverUrl,
  sessionId,
  breadcrumbs,
}) => {
  const [initialized, setInitialized] = React.useState(false);

  console.log("✅ Using server URL for session:", serverUrl);

  // Set global config for FileService
  React.useEffect(() => {
    setFileServiceConfig({ serverUrl, sessionId });
    setInitialized(true);
  }, [serverUrl, sessionId]);

  if (!initialized) {
    return null;
  }

  return (
    <ChallengeEditor
      serverUrl={serverUrl}
      sessionId={sessionId}
      breadcrumbs={breadcrumbs}
    />
  );
};

export default ChallengeEditorPage;
