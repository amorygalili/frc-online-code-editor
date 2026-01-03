import { Box, CircularProgress, Typography } from "@mui/material";
import {
  getDefaultSimVisualization,
  getSimVisualization,
  setSimVisualization,
} from "../window-api";
import { useEffect, useState } from "react";
import { getServiceUrl } from "../urls";
import { useConfig } from "../contexts/ConfigContext";

const SimulationVisualization = () => {
  const {
    config: { serverUrl, sessionId },
  } = useConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visualizationKey, setVisualizationKey] = useState(0);

  const containerEndpoint = getServiceUrl(serverUrl, sessionId, "main");
  console.log("Container endpoint:", { containerEndpoint });

  useEffect(() => {
    // Reset to default visualization when session changes
    setSimVisualization(null);
    setVisualizationKey((prev) => prev + 1);
    setError(null);

    if (!sessionId) {
      return;
    }

    const loadSimVisualization = async () => {
      setLoading(true);
      setError(null);

      try {
        const simVisUrl = `${containerEndpoint}/sim-visualization/index.js`;
        console.log(`Loading sim-visualization from: ${simVisUrl}`);

        // Dynamically import the sim-visualization module
        const module = await import(/* @vite-ignore */ simVisUrl);

        // The module default export is the visualization component
        if (module.default) {
          const VisualizationComponent = module.default;
          setSimVisualization(<VisualizationComponent />);
          setVisualizationKey((prev) => prev + 1);
          console.log("Sim-visualization loaded successfully");
        } else {
          console.warn("Sim-visualization module has no default export");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.warn(`Failed to load sim-visualization: ${errorMessage}`);
        // Keep the default visualization - don't show error to user as it's optional
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    loadSimVisualization();
  }, [containerEndpoint, sessionId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body2">Loading visualization...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <div key={visualizationKey}>
      {getSimVisualization() || getDefaultSimVisualization()}
    </div>
  );
};

export default SimulationVisualization;
