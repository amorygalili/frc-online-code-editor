import { Box, Paper, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollableBox } from './ScrollableBox';

interface InstructionsPanelProps {
  className?: string;
  instructions?: string;
}

// Dummy markdown content - will be replaced with actual challenge instructions later
const DUMMY_INSTRUCTIONS = `No instructions available.`;

export const InstructionsPanel = ({ className, instructions = DUMMY_INSTRUCTIONS }: InstructionsPanelProps) => {
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
        
        <ScrollableBox
          sx={{
            flex: 1,
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
              mb: 1,
              // Custom scrollbar for code blocks
              '&::-webkit-scrollbar': {
                height: '8px',
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                },
              },
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
            {instructions}
          </ReactMarkdown>
        </ScrollableBox>
      </Paper>
    </Box>
  );
};

export default InstructionsPanel;

