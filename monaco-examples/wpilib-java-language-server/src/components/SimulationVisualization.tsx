import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import RobotModeSelector from './RobotModeSelector';

export const SimulationVisualization: React.FC = () => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="h2">
          Robot Simulation
        </Typography>
      </Box>

      {/* Robot Mode Selector */}
      <Box sx={{ mb: 2 }}>
        <RobotModeSelector />
      </Box>

      {/* Visualization Area - Placeholder */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'action.hover',
          borderRadius: 1,
          border: 2,
          borderStyle: 'dashed',
          borderColor: 'divider',
          minHeight: 200,
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="h6" gutterBottom>
            Simulation Visualization
          </Typography>
          <Typography variant="body2">
            Robot field visualization will appear here
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            (Coming Soon)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default SimulationVisualization;
