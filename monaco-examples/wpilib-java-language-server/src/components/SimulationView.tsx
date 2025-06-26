import React from 'react';
import {
  Box,
  Paper,
} from '@mui/material';
import { SimulationVisualization } from './SimulationVisualization';
import { OutputTabs } from './BottomPanel';
import { ResizableSplitter } from './ResizableSplitter';

export const SimulationView: React.FC = () => {
  return (
    <Box
      sx={{
        width: '100%', // Take full width from splitter
        height: '100%',
        borderLeft: 1,
        borderColor: 'divider',
        backgroundColor: 'background.default',
      }}
    >
      <ResizableSplitter
        direction="vertical"
        initialSizes={[45, 55]} // 45% for visualization, 55% for output tabs
        minSizes={[200, 150]} // Minimum heights in pixels
      >
        {/* Simulation Visualization Area */}
        <Box
          sx={{
            p: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <SimulationVisualization />
        </Box>

        {/* Output Tabs Area */}
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
            }}
          >
            <OutputTabs />
          </Paper>
        </Box>
      </ResizableSplitter>
    </Box>
  );
};

export default SimulationView;
