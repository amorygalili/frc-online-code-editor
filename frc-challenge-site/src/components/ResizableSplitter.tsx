import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, styled } from '@mui/material';

interface ResizableSplitterProps {
  children: [React.ReactNode, React.ReactNode];
  direction: 'horizontal' | 'vertical';
  initialSizes?: [number, number]; // Percentages that should add up to 100
  minSizes?: [number, number]; // Minimum sizes in pixels
  className?: string;
}

const SplitterContainer = styled(Box)<{ direction: 'horizontal' | 'vertical' }>(({ direction }) => ({
  display: 'flex',
  flexDirection: direction === 'horizontal' ? 'row' : 'column',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}));

const SplitterHandle = styled(Box)<{ direction: 'horizontal' | 'vertical' }>(({ theme, direction }) => ({
  backgroundColor: theme.palette.divider,
  cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
  flexShrink: 0,
  position: 'relative',
  zIndex: 1,
  
  ...(direction === 'horizontal' ? {
    width: '4px',
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
      width: '6px',
      marginLeft: '-1px',
      marginRight: '-1px',
    }
  } : {
    height: '4px',
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
      height: '6px',
      marginTop: '-1px',
      marginBottom: '-1px',
    }
  }),
  
  transition: theme.transitions.create(['background-color', 'width', 'height'], {
    duration: theme.transitions.duration.shortest,
  }),
}));

const Panel = styled(Box)<{ size: number }>(({ size }) => ({
  flex: `0 0 ${size}%`,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  children,
  direction,
  initialSizes = [50, 50],
  minSizes = [100, 100],
  className,
}) => {
  const [sizes, setSizes] = useState(initialSizes);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizesRef = useRef(initialSizes);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSizesRef.current = [...sizes];
    
    // Add global event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction, sizes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerSize = direction === 'horizontal' ? containerRect.width : containerRect.height;
    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPosRef.current;
    const deltaPercent = (delta / containerSize) * 100;

    const newFirstSize = startSizesRef.current[0] + deltaPercent;
    const newSecondSize = startSizesRef.current[1] - deltaPercent;

    // Calculate minimum sizes as percentages
    const minFirstPercent = (minSizes[0] / containerSize) * 100;
    const minSecondPercent = (minSizes[1] / containerSize) * 100;

    // Enforce minimum sizes
    if (newFirstSize >= minFirstPercent && newSecondSize >= minSecondPercent) {
      setSizes([newFirstSize, newSecondSize]);
    }
  }, [direction, minSizes]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <SplitterContainer 
      ref={containerRef}
      direction={direction}
      className={className}
      sx={{
        ...(isDragging && {
          '& *': {
            pointerEvents: 'none',
          }
        })
      }}
    >
      <Panel size={sizes[0]}>
        {children[0]}
      </Panel>
      
      <SplitterHandle
        direction={direction}
        onMouseDown={handleMouseDown}
      />
      
      <Panel size={sizes[1]}>
        {children[1]}
      </Panel>
    </SplitterContainer>
  );
};

export default ResizableSplitter;
