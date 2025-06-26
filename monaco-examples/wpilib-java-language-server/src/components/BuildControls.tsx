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
  PlayArrow as SimulateIcon,
} from '@mui/icons-material';
import { BuildControlsProps, BuildTask } from '../types/build';
import { useBuild } from '../contexts/BuildContext';
import { useNTConnection } from '../nt4/useNetworktables';
import { useHalSimData } from '../contexts/HalSimContext';

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
    currentOperationType,
    startBuild,
    stopBuild,
    startSimulation,
    stopSimulation,
    isConnected
  } = useBuild();

  // Connection status hooks
  const ntConnected = useNTConnection();
  const { connected: halSimConnected } = useHalSimData();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const isRunning = buildStatus === 'running';
  const canBuild = !disabled && isConnected && projectName && !isRunning;

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

  const handleStartSimulation = async () => {
    if (!projectName || !canBuild) return;

    try {
      const simulationId = await startSimulation(projectName, 'debug');
      if (simulationId) {
        console.log('Simulation started with ID:', simulationId);
      }
    } catch (error) {
      console.error('Failed to start simulation:', error);
    }
  };

  const handleStopSimulation = async () => {
    if (currentBuildId) {
      try {
        await stopSimulation(currentBuildId);
      } catch (error) {
        console.error('Failed to stop simulation:', error);
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
        return currentOperationType === 'simulation' ? 'Simulating...' : 'Building...';
      case 'success':
        return currentOperationType === 'simulation' ? 'Simulation Complete' : 'Build Successful';
      case 'failed':
        return currentOperationType === 'simulation' ? 'Simulation Failed' : 'Build Failed';
      case 'error':
        return currentOperationType === 'simulation' ? 'Simulation Error' : 'Build Error';
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
        gap: 1, // Reduced from 2
        p: 0, // Removed padding
      }}
    >
      {/* Main build buttons */}
      <ButtonGroup variant="contained" size="small" disabled={!canBuild}>
        <Tooltip title="Build project">
          <Button
            startIcon={isRunning ? <CircularProgress size={14} /> : <BuildIcon fontSize="small" />}
            onClick={() => handleBuildTask('build')}
            disabled={!canBuild}
            sx={{ px: 1.5 }}
          >
            Build
          </Button>
        </Tooltip>

        <Tooltip title="Clean project">
          <Button
            startIcon={<CleanIcon fontSize="small" />}
            onClick={() => handleBuildTask('clean')}
            disabled={!canBuild}
            sx={{ px: 1.5 }}
          >
            Clean
          </Button>
        </Tooltip>

        <Tooltip title="More build options">
          <Button
            onClick={handleMenuOpen}
            disabled={!canBuild}
            sx={{ px: 1 }}
          >
            <MoreIcon fontSize="small" />
          </Button>
        </Tooltip>
      </ButtonGroup>

      {/* Simulation button */}
      <Tooltip title="Start robot simulation">
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          startIcon={<SimulateIcon fontSize="small" />}
          onClick={handleStartSimulation}
          disabled={!canBuild}
          sx={{ px: 1.5 }}
        >
          Simulate
        </Button>
      </Tooltip>

      {/* Stop button (only shown when building/simulating) */}
      {isRunning && (
        <Tooltip title="Stop build/simulation">
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<StopIcon fontSize="small" />}
            onClick={() => {
              // Try to stop both build and simulation
              handleStopBuild();
              handleStopSimulation();
            }}
            sx={{ px: 1.5 }}
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
        icon={isRunning ? <CircularProgress size={16} /> : undefined}
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

      {/* NT4 Connection Status */}
      <Chip
        label={`NT4: ${ntConnected ? 'Connected' : 'Disconnected'}`}
        color={ntConnected ? 'success' : 'error'}
        size="small"
        variant="outlined"
        sx={{ fontSize: '0.65rem', height: 20 }}
      />

      {/* HAL Simulation Connection Status */}
      <Chip
        label={`HAL: ${halSimConnected ? 'Connected' : 'Disconnected'}`}
        color={halSimConnected ? 'success' : 'error'}
        size="small"
        variant="outlined"
        sx={{ fontSize: '0.65rem', height: 20 }}
      />

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