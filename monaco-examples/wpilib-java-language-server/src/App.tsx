/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
} from "@mui/material";

// Import pages
import HomePage from "./pages/HomePage";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengePage from "./pages/ChallengePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";

// Import components
import Navigation from "./components/Navigation";

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

// Mock authentication state - this will be replaced with AWS Cognito
const mockUser = {
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  avatar: "",
};

function App() {
  // Mock authentication state - this will be replaced with AWS Cognito
  const isAuthenticated = false; // Set to true to test authenticated state
  const user = isAuthenticated ? mockUser : undefined;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation isAuthenticated={isAuthenticated} user={user} />

          <Box component="main" sx={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/challenge/:id" element={<ChallengePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Fallback route */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
