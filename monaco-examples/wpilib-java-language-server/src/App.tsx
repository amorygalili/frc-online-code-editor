/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import { useState, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  Alert
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  FolderOpen,
  AccountTree,
  Add
} from '@mui/icons-material';
import { MonacoEditorLanguageClientWrapper } from 'monaco-editor-wrapper';
import { WPILibEditorWrapper } from './components/WPILibEditorWrapper.tsx';
import { FileBrowser } from './components/FileBrowser.tsx';
import { ProjectBrowser } from './components/ProjectBrowser.tsx';
import { ProjectGenerator } from './components/ProjectGenerator.tsx';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const DRAWER_WIDTH = 320;

function App() {
  const [isEditorStarted, setIsEditorStarted] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showProjectBrowser, setShowProjectBrowser] = useState(false);
  const [showProjectGenerator, setShowProjectGenerator] = useState(false);
  const [editorWrapper, setEditorWrapper] = useState<MonacoEditorLanguageClientWrapper | null>(null);

  const handleEditorLoad = useCallback((wrapper: MonacoEditorLanguageClientWrapper) => {
    setEditorWrapper(wrapper);
  }, []);

  const handleStart = useCallback(async () => {
    if (editorWrapper) {
      try {
        await editorWrapper.start();
        setIsEditorStarted(true);
        console.log("Language server started...");
      } catch (error) {
        console.error("Failed to start language server:", error);
      }
    }
  }, [editorWrapper]);

  const handleDispose = useCallback(async () => {
    if (editorWrapper) {
      try {
        await editorWrapper.dispose();
        setIsEditorStarted(false);
        console.log("Language server disposed...");
      } catch (error) {
        console.error("Failed to dispose language server:", error);
      }
    }
  }, [editorWrapper]);

  const closeSidebars = () => {
    setShowFileBrowser(false);
    setShowProjectBrowser(false);
    setShowProjectGenerator(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              WPILib Java Language Client & Language Server
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                startIcon={<PlayArrow />}
                onClick={handleStart}
                disabled={!editorWrapper || isEditorStarted}
                variant="outlined"
                size="small"
              >
                Start
              </Button>
              <Button
                color="inherit"
                startIcon={<Stop />}
                onClick={handleDispose}
                disabled={!editorWrapper || !isEditorStarted}
                variant="outlined"
                size="small"
              >
                Stop
              </Button>
              <Button
                color="inherit"
                startIcon={<FolderOpen />}
                onClick={() => {
                  closeSidebars();
                  setShowFileBrowser(!showFileBrowser);
                }}
                variant={showFileBrowser ? "contained" : "outlined"}
                size="small"
              >
                Files
              </Button>
              <Button
                color="inherit"
                startIcon={<AccountTree />}
                onClick={() => {
                  closeSidebars();
                  setShowProjectBrowser(!showProjectBrowser);
                }}
                variant={showProjectBrowser ? "contained" : "outlined"}
                size="small"
              >
                Projects
              </Button>
              <Button
                color="inherit"
                startIcon={<Add />}
                onClick={() => {
                  closeSidebars();
                  setShowProjectGenerator(!showProjectGenerator);
                }}
                variant={showProjectGenerator ? "contained" : "outlined"}
                size="small"
              >
                Generate
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Alert severity="info" sx={{ borderRadius: 0 }}>
          Launch backend with: <strong>docker compose up -d</strong>
        </Alert>

        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Drawer
            variant="persistent"
            anchor="left"
            open={showFileBrowser || showProjectBrowser || showProjectGenerator}
            sx={{
              width: DRAWER_WIDTH,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                position: 'relative',
              },
            }}
          >
            {showFileBrowser && (
              <FileBrowser
                editorWrapper={editorWrapper}
                onClose={() => setShowFileBrowser(false)}
              />
            )}
            {showProjectBrowser && (
              <ProjectBrowser
                onClose={() => setShowProjectBrowser(false)}
              />
            )}
            {showProjectGenerator && (
              <ProjectGenerator
                onClose={() => setShowProjectGenerator(false)}
              />
            )}
          </Drawer>

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <WPILibEditorWrapper onLoad={handleEditorLoad} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
