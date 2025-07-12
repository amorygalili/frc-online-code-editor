/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  Box,
  Drawer,
} from "@mui/material";
import { WPILibEditorWrapper } from "./components/WPILibEditorWrapper.tsx";
import { FileBrowser } from "./components/FileBrowser.tsx";
import { SimulationView } from "./components/SimulationView.tsx";
import { ResizableSplitter } from "./components/ResizableSplitter.tsx";


const DRAWER_WIDTH = 240; // Reduced from 320 to make more compact

// Editor content without header (for use in ChallengeEditorPage)
interface EditorBodyProps {
  onFileOpen: (filePath: string) => Promise<void>;
}

export function EditorBody({ onFileOpen }: EditorBodyProps) {
  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={true}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            position: "relative",
          },
        }}
      >
        <FileBrowser onClose={() => {}} onFileOpen={onFileOpen} />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          overflow: "hidden",
        }}
      >
        <ResizableSplitter
          direction="horizontal"
          initialSizes={[70, 30]} // 70% for editor, 30% for simulation
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
    </Box>
  );
}

