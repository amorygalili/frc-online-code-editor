/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Build as BuildIcon,
  CleaningServices as CleanIcon,
  Rocket as DeployIcon,
  Stop as StopIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { BuildControlsProps, BuildTask } from '../types/build';
import { useBuild } from '../contexts/BuildContext';

/**
 * BuildControls component for build actions and status
 */
export const BuildControls: React.FC<BuildControlsProps> = ({
  projectName,
  onBuildStart,
  onBuildComplete: _onBuildComplete,
  disabled = false,
  className
}) => {
  const {
    currentBuildId,
    buildStatus,
    startBuild,
    stopBuild,
    isConnected
  } = useBuild();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const isBuilding = buildStatus === 'running';
  const canBuild = !disabled && isConnected && projectName && !isBuilding;

  const handleBuildTask = async (task: BuildTask) => {
    if (!projectName || !canBuild) return;

    try {
      const buildId = await startBuild(projectName, task);
      if (buildId && onBuildStart) {
        onBuildStart(buildId);
      }
    } catch (error) {
      console.error('Failed to start build:', error);
    }
  };

  const handleStopBuild = async () => {
    if (currentBuildId) {
      try {
        await stopBuild(currentBuildId);
      } catch (error) {
        console.error('Failed to stop build:', error);
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (task: BuildTask) => {
    handleBuildTask(task);
    handleMenuClose();
  };

  const getStatusColor = (): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (buildStatus) {
      case 'running':
        return 'info';
      case 'success':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (buildStatus) {
      case 'running':
        return 'Building...';
      case 'success':
        return 'Build Successful';
      case 'failed':
        return 'Build Failed';
      case 'error':
        return 'Build Error';
      default:
        return 'Ready';
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1,
      }}
    >
      {/* Main build buttons */}
      <ButtonGroup variant="contained" disabled={!canBuild}>
        <Tooltip title="Build project">
          <Button
            startIcon={isBuilding ? <CircularProgress size={16} /> : <BuildIcon />}
            onClick={() => handleBuildTask('build')}
            disabled={!canBuild}
          >
            Build
          </Button>
        </Tooltip>

        <Tooltip title="Clean project">
          <Button
            startIcon={<CleanIcon />}
            onClick={() => handleBuildTask('clean')}
            disabled={!canBuild}
          >
            Clean
          </Button>
        </Tooltip>

        <Tooltip title="More build options">
          <Button
            onClick={handleMenuOpen}
            disabled={!canBuild}
          >
            <MoreIcon />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Stop button (only shown when building) */}
      {isBuilding && (
        <Tooltip title="Stop build">
          <Button
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={handleStopBuild}
          >
            Stop
          </Button>
        </Tooltip>
      )}

      {/* Status indicator */}
      <Chip
        label={getStatusText()}
        color={getStatusColor()}
        size="small"
        icon={isBuilding ? <CircularProgress size={16} /> : undefined}
      />

      {/* Connection status */}
      {!isConnected && (
        <Chip
          label="Disconnected"
          color="error"
          size="small"
          variant="outlined"
        />
      )}

      {/* More options menu */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuItemClick('deploy')}>
          <DeployIcon sx={{ mr: 1 }} />
          Deploy
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick('test')}>
          <BuildIcon sx={{ mr: 1 }} />
          Test
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick('assemble')}>
          <BuildIcon sx={{ mr: 1 }} />
          Assemble
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default BuildControls;