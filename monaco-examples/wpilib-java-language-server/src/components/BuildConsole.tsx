/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2024 TypeFox and others.
 * Licensed under the MIT License. See LICENSE in the package root for license information.
 * ------------------------------------------------------------------------------------------ */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { BuildConsoleProps, BuildOutputLine, BuildOutputMessage } from '../types/build';
import { useBuild } from '../contexts/BuildContext';

/**
 * Convert build output messages to display lines
 */
const convertToOutputLines = (messages: BuildOutputMessage[]): BuildOutputLine[] => {
  return messages.map((message, index) => ({
    id: `${index}-${message.timestamp}`,
    type: message.type,
    content: message.content || message.error || `Status: ${message.status}`,
    timestamp: message.timestamp,
    className: getLineClassName(message.type, message.status)
  }));
};

/**
 * Get CSS class name for output line based on type and status
 */
const getLineClassName = (type: string, status?: string): string => {
  switch (type) {
    case 'stderr':
      return 'build-output-error';
    case 'status':
      return status === 'success' ? 'build-output-success' : 'build-output-error';
    case 'error':
      return 'build-output-error';
    default:
      return 'build-output-normal';
  }
};

/**
 * BuildConsole component for displaying build output
 */
export const BuildConsole: React.FC<BuildConsoleProps> = ({
  buildId: _buildId,
  maxLines = 1000,
  autoScroll = true,
  className
}) => {
  const { buildOutput, buildStatus, clearOutput, isConnected, currentOperationType } = useBuild();
  const outputRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Convert messages to display lines
  const outputLines = useMemo(() => {
    const lines = convertToOutputLines(buildOutput);
    return lines.slice(-maxLines); // Keep only the last maxLines
  }, [buildOutput, maxLines]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && outputRef.current && isExpanded) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines, autoScroll, isExpanded]);

  const handleClear = () => {
    clearOutput();
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getStatusColor = () => {
    switch (buildStatus) {
      case 'running':
        return '#2196f3'; // Blue
      case 'success':
        return '#4caf50'; // Green
      case 'failed':
      case 'error':
        return '#f44336'; // Red
      default:
        return '#757575'; // Gray
    }
  };

  const getStatusText = () => {
    switch (buildStatus) {
      case 'running':
        return 'Building...';
      case 'success':
        return 'Build Successful';
      case 'failed':
        return 'Build Failed';
      case 'error':
        return 'Build Error';
      default:
        return 'Ready';
    }
  };

  return (
    <Paper
      elevation={1}
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 200,
        maxHeight: 600,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {currentOperationType === 'simulation' ? 'Simulation Console' : 'Build Console'}
          </Typography>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {getStatusText()}
          </Typography>
          {!isConnected && (
            <Typography variant="caption" color="error">
              (Disconnected)
            </Typography>
          )}
        </Box>

        <Box>
          <Tooltip title="Clear output">
            <IconButton size="small" onClick={handleClear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isExpanded ? "Collapse" : "Expand"}>
            <IconButton size="small" onClick={handleToggleExpand}>
              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Output area */}
      {isExpanded && (
        <Box
          ref={outputRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 1,
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
            fontSize: '12px',
            lineHeight: 1.4,
            '& .build-output-normal': {
              color: '#d4d4d4',
            },
            '& .build-output-error': {
              color: '#f48771',
            },
            '& .build-output-success': {
              color: '#73c991',
            },
          }}
        >
          {outputLines.length === 0 ? (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontStyle: 'italic',
                textAlign: 'center',
                mt: 2,
              }}
            >
              No build output yet. Start a build to see output here.
            </Typography>
          ) : (
            outputLines.map((line) => (
              <Box
                key={line.id}
                component="pre"
                className={line.className}
                sx={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {line.content}
              </Box>
            ))
          )}
        </Box>
      )}
    </Paper>
  );
};

export default BuildConsole;