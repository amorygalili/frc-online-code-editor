/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  Toolbar,
  Chip
} from '@mui/material';
import { Close, AccountTree } from '@mui/icons-material';
import { FileService, type WPILibProject } from '../fileService';

interface ProjectBrowserProps {
  onClose: () => void;
}

export const ProjectBrowser: React.FC<ProjectBrowserProps> = ({ onClose }) => {
  const [projects, setProjects] = useState<WPILibProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Loading WPILib projects...");
        const projectList = await FileService.listWPILibProjects();
        setProjects(projectList);
        
        if (projectList.length === 0) {
          setError("No WPILib projects found");
        }
      } catch (err) {
        console.error("Failed to load WPILib projects:", err);
        setError(`Failed to load WPILib projects: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const handleProjectClick = async (project: WPILibProject) => {
    try {
      console.log(`Loading project: ${project.name}`);
      // TODO: Load project files into editor
      // For now, just show the project info
      alert(`Selected project: ${project.name}\nPath: ${project.path}`);
    } catch (error) {
      console.error(`Failed to load project ${project.name}:`, error);
      alert(
        `Failed to load project: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          WPILib Projects
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Toolbar>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && projects.length > 0 && (
          <List dense>
            {projects.map((project, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => handleProjectClick(project)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountTree fontSize="small" />
                        <Typography variant="subtitle2" fontWeight="bold">
                          {project.name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={`Team ${project.teamNumber}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={project.projectYear}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={project.language}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};
