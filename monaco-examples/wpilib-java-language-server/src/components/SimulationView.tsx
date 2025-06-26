import React from 'react';
import {
  Box,
  Paper,
} from '@mui/material';
import { SimulationVisualization } from './SimulationVisualization';
import { OutputTabs } from './BottomPanel';

export const SimulationView: React.FC = () => {
  return (
    <Box
      sx={{
        width: 400, // Fixed width for simulation panel
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
    >
      {/* Simulation Visualization Area */}
      <Box
        sx={{
          height: 300, // Fixed height for visualization
          p: 1,
        }}
      >
        <SimulationVisualization />
      </Box>

      {/* Output Tabs Area */}
      <Box
        sx={{
          flex: 1, // Take remaining space
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // Allow shrinking
        }}
      >
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <OutputTabs />
        </Paper>
      </Box>
    </Box>
  );
};

export default SimulationView;
