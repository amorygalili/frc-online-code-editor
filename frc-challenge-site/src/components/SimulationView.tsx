import { Box, Paper } from "@mui/material";
import { OutputTabs } from "./BottomPanel";
import { ResizableSplitter } from "./ResizableSplitter";
import { getSimVisualization } from "../window-api";
import ScrollableBox from "./ScrollableBox";

export const SimulationView = () => {
  return (
    <Box
      sx={{
        width: "100%", // Take full width from splitter
        height: "100%",
        borderLeft: 1,
        borderColor: "divider",
        backgroundColor: "background.default",
        paddingRight: '12px'
      }}
    >
      <ResizableSplitter
        direction="vertical"
        initialSizes={[60, 40]} // 45% for visualization, 55% for output tabs
        minSizes={[200, 150]} // Minimum heights in pixels
      >
        {/* Simulation Visualization Area */}
        <ScrollableBox
          sx={{
            p: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {getSimVisualization()}
        </ScrollableBox>

        {/* Output Tabs Area */}
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
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
