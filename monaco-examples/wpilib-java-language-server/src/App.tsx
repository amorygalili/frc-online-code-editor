/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";

// Import pages
import HomePage from "./pages/HomePage";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengePage from "./pages/ChallengePage";
import ChallengeEditorPage from "./pages/ChallengeEditorPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import { TestPage } from "./pages/TestPage";

// Import components
import Navigation from "./components/Navigation";

// Import authentication
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { configureAuth } from "./config/auth";

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

// Loading component
const LoadingScreen = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 2,
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="h6" color="text.secondary">
      Loading FRC Challenge Site...
    </Typography>
  </Box>
);

// Component that conditionally shows navigation
function AppLayout() {
  const location = useLocation();

  // Hide main navigation for editor routes
  const isEditorRoute = location.pathname.includes('/editor');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isEditorRoute && (
        <Navigation  />
      )}

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/challenge/:id" element={<ChallengePage />} />
          <Route path="/challenge/:id/editor" element={<ChallengeEditorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/test" element={<TestPage />} />

          {/* Fallback route */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Box>
    </Box>
  );
}

// Main app content that uses authentication
function AppContent() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

function App() {
  useEffect(() => {
    // Configure AWS Amplify on app startup
    configureAuth();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
