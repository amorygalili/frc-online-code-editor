import { Box, BoxProps } from '@mui/material';

/**
 * A Box component with custom scrollbar styling that matches the dark theme.
 * Use this component anywhere you need a scrollable container with themed scrollbars.
 */
export const ScrollableBox: React.FC<BoxProps> = (props) => {
  const { sx, ...otherProps } = props;

  return (
    <Box
      {...otherProps}
      sx={{
        overflow: 'auto',
        // Custom scrollbar styling for WebKit browsers (Chrome, Safari, Edge)
        '&::-webkit-scrollbar': {
          width: '12px',
          height: '12px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          border: '2px solid transparent',
          backgroundClip: 'content-box',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
          },
        },
        // Firefox scrollbar styling
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.1)',
        // Merge with any additional sx props passed in
        ...sx,
      }}
    />
  );
};

export default ScrollableBox;

