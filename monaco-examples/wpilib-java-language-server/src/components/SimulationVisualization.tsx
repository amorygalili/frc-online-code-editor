import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import RobotModeSelector from "./RobotModeSelector";
import { Field, FieldRobot } from "@frc-web-components/react";
import { useNTValue, useNTConnection } from "../nt4/useNetworktables";

export const SimulationVisualization: React.FC = () => {
  // Get robot pose from NetworkTables
  const [robotPose] = useNTValue<[number, number, number]>("/SmartDashboard/Field/Robot", [0, 0, 0]);
  const connected = useNTConnection();
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.paper",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          pb: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" component="h2">
          Robot Simulation
        </Typography>
        <Typography variant="caption" color={connected ? "success.main" : "error.main"}>
          NT4: {connected ? "Connected" : "Disconnected"}
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "action.hover",
          borderRadius: 1,
          border: 2,
          borderStyle: "dashed",
          borderColor: "divider",
          minHeight: 200,
        }}
      >
        <Field game="Reefscape" rotationUnit="deg">
          <FieldRobot pose={robotPose} />
        </Field>
      </Box>
    </Paper>
  );
};

export default SimulationVisualization;
