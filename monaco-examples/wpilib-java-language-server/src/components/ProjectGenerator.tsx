/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Alert,
  Toolbar,
  Stack,
  CircularProgress
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { FileService, type ProjectGenerationOptions, type ProjectGenerationResult } from '../fileService';

interface ProjectGeneratorProps {
  onClose: () => void;
}

export const ProjectGenerator: React.FC<ProjectGeneratorProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<ProjectGenerationOptions>({
    name: '',
    teamNumber: undefined,
    packageName: '',
  });
  const [status, setStatus] = useState<{
    message: string;
    type: 'info' | 'success' | 'error';
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'teamNumber' ? (value ? parseInt(value) : undefined) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setStatus({
        message: "Project name is required",
        type: 'error'
      });
      return;
    }

    setIsGenerating(true);
    setStatus({
      message: "Generating project...",
      type: 'info'
    });

    try {
      console.log("Generating WPILib project with options:", formData);
      const result: ProjectGenerationResult = await FileService.generateWPILibProject(formData);

      if (result.success) {
        setStatus({
          message: `Project '${result.projectName}' generated successfully!`,
          type: 'success'
        });

        // Clear the form
        setFormData({
          name: '',
          teamNumber: undefined,
          packageName: '',
        });

        // Optionally close the form after successful generation
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatus({
          message: `Failed to generate project: ${result.message}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Failed to generate project:", error);
      setStatus({
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      teamNumber: undefined,
      packageName: '',
    });
    setStatus(null);
    onClose();
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Generate Robot Project
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Toolbar>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Project Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="MyRobotProject"
              disabled={isGenerating}
              fullWidth
              size="small"
            />

            <TextField
              label="Team Number"
              name="teamNumber"
              type="number"
              value={formData.teamNumber || ''}
              onChange={handleInputChange}
              placeholder="0"
              disabled={isGenerating}
              fullWidth
              size="small"
            />

            <TextField
              label="Package Name"
              name="packageName"
              value={formData.packageName}
              onChange={handleInputChange}
              placeholder="frc.robot"
              disabled={isGenerating}
              fullWidth
              size="small"
            />

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={isGenerating ? <CircularProgress size={16} /> : <Add />}
                disabled={isGenerating || !formData.name.trim()}
                fullWidth
              >
                {isGenerating ? 'Generating...' : 'Generate Project'}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={handleCancel}
                disabled={isGenerating}
              >
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>

        {status && (
          <Alert
            severity={status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info'}
            sx={{ mt: 2 }}
          >
            {status.message}
          </Alert>
        )}
      </Box>
    </Box>
  );
};
