import { Box, Paper } from "@mui/material";
import { OutputTabs } from "./BottomPanel";
import { ResizableSplitter } from "./ResizableSplitter";
import ScrollableBox from "./ScrollableBox";
import SimulationVisualization from "./SimulationVisualization";

export const SimulationView = () => {

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        borderLeft: 1,
        borderColor: "divider",
        backgroundColor: "background.default",
        paddingRight: '12px'
      }}
    >
      <ResizableSplitter
        direction="vertical"
        initialSizes={[60, 40]}
        minSizes={[200, 150]}
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
          <SimulationVisualization />
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
