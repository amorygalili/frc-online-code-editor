/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

// Main app content that uses authentication
function AppContent() {
  const { user, isLoading, isAuthenticated, isConfigured } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navigation isAuthenticated={isAuthenticated} user={user || undefined} />

        <Box component="main" sx={{ flexGrow: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/challenges" element={<ChallengesPage />} />
            <Route path="/challenge/:id" element={<ChallengePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/test" element={<TestPage />} />

            {/* Fallback route */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Box>

        {/* Development indicator */}
        {!isConfigured && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              px: 2,
              py: 1,
              borderRadius: 1,
              fontSize: '0.875rem',
              zIndex: 1000,
            }}
          >
            Demo Mode - Configure AWS Cognito for production
          </Box>
        )}
      </Box>
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
