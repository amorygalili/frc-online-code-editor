import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import {
  RadioButtonUnchecked,
  SmartToy,
  SportsEsports,
  BugReport,
} from '@mui/icons-material';
import { useDriverStation, RobotMode } from '../contexts/HalSimContext';

const RobotModeSelector: React.FC = () => {
  const { currentMode, isEnabled, isConnected, setRobotMode, setRobotEnabled } = useDriverStation();

  const handleModeChange = (event: SelectChangeEvent<string>) => {
    const newMode = event.target.value as RobotMode;
    
    // If selecting disabled, disable the robot
    if (newMode === RobotMode.DISABLED) {
      setRobotEnabled(false);
    } else {
      // Enable the robot and set the mode
      setRobotEnabled(true);
      setRobotMode(newMode);
    }
  };

  const getModeIcon = (mode: RobotMode) => {
    switch (mode) {
      case RobotMode.DISABLED:
        return <RadioButtonUnchecked fontSize="small" />;
      case RobotMode.AUTONOMOUS:
        return <SmartToy fontSize="small" />;
      case RobotMode.TELEOP:
        return <SportsEsports fontSize="small" />;
      case RobotMode.TEST:
        return <BugReport fontSize="small" />;
      default:
        return <RadioButtonUnchecked fontSize="small" />;
    }
  };

  const getModeColor = (mode: RobotMode) => {
    switch (mode) {
      case RobotMode.DISABLED:
        return 'default';
      case RobotMode.AUTONOMOUS:
        return 'warning';
      case RobotMode.TELEOP:
        return 'success';
      case RobotMode.TEST:
        return 'info';
      default:
        return 'default';
    }
  };

  const getModeLabel = (mode: RobotMode) => {
    switch (mode) {
      case RobotMode.DISABLED:
        return 'Disabled';
      case RobotMode.AUTONOMOUS:
        return 'Autonomous';
      case RobotMode.TELEOP:
        return 'Teleop';
      case RobotMode.TEST:
        return 'Test';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Connection Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" color="text.secondary">
          HAL Simulation
        </Typography>
        <Chip
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      </Box>

      {/* Current Mode Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Current Mode:
        </Typography>
        <Chip
          icon={getModeIcon(currentMode)}
          label={getModeLabel(currentMode)}
          color={getModeColor(currentMode) as any}
          size="small"
          variant={isEnabled ? 'filled' : 'outlined'}
        />
      </Box>

      {/* Mode Selector */}
      <FormControl fullWidth size="small" disabled={!isConnected}>
        <InputLabel id="robot-mode-select-label">Robot Mode</InputLabel>
        <Select
          labelId="robot-mode-select-label"
          id="robot-mode-select"
          value={currentMode}
          label="Robot Mode"
          onChange={handleModeChange}
        >
          <MenuItem value={RobotMode.DISABLED}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RadioButtonUnchecked fontSize="small" />
              Disabled
            </Box>
          </MenuItem>
          <MenuItem value={RobotMode.AUTONOMOUS}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToy fontSize="small" />
              Autonomous
            </Box>
          </MenuItem>
          <MenuItem value={RobotMode.TELEOP}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsEsports fontSize="small" />
              Teleop
            </Box>
          </MenuItem>
          <MenuItem value={RobotMode.TEST}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport fontSize="small" />
              Test
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Additional Info */}
      {isConnected && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Select a robot mode to control the simulation state
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RobotModeSelector;
