/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  Box,
} from "@mui/material";
import { WPILibEditorWrapper } from "./components/WPILibEditorWrapper.tsx";
import { FileBrowser } from "./components/FileBrowser.tsx";
import { SimulationView } from "./components/SimulationView.tsx";
import { ResizableSplitter } from "./components/ResizableSplitter.tsx";
import { InstructionsPanel } from "./components/InstructionsPanel.tsx";

// Editor content without header (for use in ChallengeEditorPage)
interface EditorBodyProps {
  onFileOpen: (filePath: string) => Promise<void>;
}

export function EditorBody({ onFileOpen }: EditorBodyProps) {
  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left side: File browser and instructions with vertical splitter */}
      <ResizableSplitter
        direction="horizontal"
        initialSizes={[20, 80]} // 20% for sidebar, 80% for main content
        minSizes={[200, 600]} // Minimum widths in pixels
      >
        {/* Left sidebar with file browser and instructions */}
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: 1,
            borderColor: "divider",
          }}
        >
          <ResizableSplitter
            direction="vertical"
            initialSizes={[35, 65]}
            minSizes={[150, 150]} // Minimum heights in pixels
          >
            {/* File browser */}
            <Box
              sx={{
                height: "100%",
                overflow: "hidden",
              }}
            >
              <FileBrowser onClose={() => {}} onFileOpen={onFileOpen} />
            </Box>

            {/* Instructions panel */}
            <Box
              sx={{
                height: "100%",
                overflow: "hidden",
              }}
            >
              <InstructionsPanel />
            </Box>
          </ResizableSplitter>
        </Box>

        {/* Right side: Editor and simulation */}
        <Box
          sx={{
            height: "100%",
            overflow: "hidden",
          }}
        >
          <ResizableSplitter
            direction="horizontal"
            initialSizes={[55, 45]}
            minSizes={[400, 300]} // Minimum widths in pixels
          >
            {/* Editor area */}
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <WPILibEditorWrapper />
            </Box>

            {/* Simulation view */}
            <SimulationView />
          </ResizableSplitter>
        </Box>
      </ResizableSplitter>
    </Box>
  );
}

