import { Box, Paper, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface InstructionsPanelProps {
  className?: string;
}

// Dummy markdown content - will be replaced with actual challenge instructions later
const DUMMY_INSTRUCTIONS = `# Challenge Instructions

## Overview
This is a placeholder for challenge instructions. The actual instructions will be loaded dynamically based on the selected challenge.

## Objectives
- [ ] Complete the first task
- [ ] Complete the second task
- [ ] Complete the third task

## Getting Started
1. Read through the requirements carefully
2. Implement the necessary code changes
3. Test your solution using the simulation
4. Verify all objectives are met

## Tips
- Use the file browser on the left to navigate your code
- The simulation view on the right shows real-time feedback
- NetworkTables can be used to debug your robot's state

## Resources
- [WPILib Documentation](https://docs.wpilib.org)
- [FRC Programming Guide](https://docs.wpilib.org/en/stable/docs/zero-to-robot/introduction.html)

Good luck! 🚀
`;

export const InstructionsPanel: React.FC<InstructionsPanelProps> = ({ className }) => {
  return (
    <Box 
      className={className}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Instructions
          </Typography>
        </Box>
        
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            '& h1': {
              fontSize: '1.5rem',
              fontWeight: 600,
              mt: 2,
              mb: 1,
              '&:first-of-type': {
                mt: 0
              }
            },
            '& h2': {
              fontSize: '1.25rem',
              fontWeight: 600,
              mt: 2,
              mb: 1
            },
            '& h3': {
              fontSize: '1.1rem',
              fontWeight: 600,
              mt: 1.5,
              mb: 0.75
            },
            '& p': {
              mb: 1,
              lineHeight: 1.6
            },
            '& ul, & ol': {
              pl: 3,
              mb: 1
            },
            '& li': {
              mb: 0.5
            },
            '& code': {
              backgroundColor: 'action.hover',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'monospace',
              fontSize: '0.875em'
            },
            '& pre': {
              backgroundColor: 'action.hover',
              p: 1.5,
              borderRadius: 1,
              overflow: 'auto',
              mb: 1
            },
            '& pre code': {
              backgroundColor: 'transparent',
              p: 0
            },
            '& a': {
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            },
            '& blockquote': {
              borderLeft: 3,
              borderColor: 'primary.main',
              pl: 2,
              ml: 0,
              fontStyle: 'italic',
              color: 'text.secondary'
            }
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {DUMMY_INSTRUCTIONS}
          </ReactMarkdown>
        </Box>
      </Paper>
    </Box>
  );
};

export default InstructionsPanel;

