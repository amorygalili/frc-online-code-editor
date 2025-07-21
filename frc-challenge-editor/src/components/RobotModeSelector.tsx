import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  const { currentMode, isConnected, setRobotMode, setRobotEnabled } = useDriverStation();

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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Mode Selector */}
      <FormControl
        size="small"
        disabled={!isConnected}
        sx={{
          minWidth: 140,
          '& .MuiInputBase-root': {
            fontSize: '0.8rem', // Slightly smaller text
          },
        }}
      >
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
    </Box>
  );
};

export default RobotModeSelector;
