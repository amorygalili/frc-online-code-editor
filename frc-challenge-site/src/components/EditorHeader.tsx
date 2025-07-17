import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { BuildControls } from "./BuildControls";

// Breadcrumb item interface
export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

// Props for the shared editor header
export interface EditorHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  projectName?: string;
  onBuildStart?: (buildId: string) => void;
  onBuildComplete?: (buildId: string, status: any) => void;
  showBuildControls?: boolean;
}

/**
 * Shared header component for both test and challenge editors
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
  breadcrumbs,
  projectName = "RobotProject",
  onBuildStart,
  onBuildComplete,
}) => {
  return (
    <AppBar position="static" elevation={1} sx={{ minHeight: 48 }}>
      <Toolbar variant="dense" sx={{ minHeight: 48, py: 0.5 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ color: "inherit", mr: 2 }}>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            
            if (item.onClick && !isLast) {
              return (
                <Link
                  key={index}
                  component="button"
                  variant="body2"
                  onClick={item.onClick}
                  sx={{ color: "inherit", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              );
            }
            
            return (
              <Typography
                key={index}
                variant="body2"
                sx={{ 
                  color: "inherit",
                  fontWeight: index === 0 ? 600 : 400 
                }}
              >
                {item.label}
              </Typography>
            );
          })}
        </Breadcrumbs>

        {/* Spacer to push everything to the right */}
        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ ml: 1 }}>
          <BuildControls
            projectName={projectName}
            onBuildStart={onBuildStart}
            onBuildComplete={onBuildComplete}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
