import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore,
  ChevronRight,
  Search,
  Clear,
  TableChart,
  AccountTree,
} from '@mui/icons-material';
import { useHalSimData } from '../contexts/HalSimContext';

interface HalSimViewerProps {
  className?: string;
}

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  value?: any;
  type?: string;
  timestamp?: number;
  deviceType?: string;
}

export const HalSimViewer: React.FC<HalSimViewerProps> = ({
  className
}) => {
  const { halSimData, connected } = useHalSimData();

  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // Build tree structure from HAL simulation data
  const treeData = useMemo(() => {
    const root = new Map<string, TreeNode>();
    
    Object.entries(halSimData).forEach(([deviceType, devices]) => {
      // Create device type node if it doesn't exist
      if (!root.has(deviceType)) {
        root.set(deviceType, {
          name: deviceType,
          fullPath: deviceType,
          children: new Map(),
          deviceType
        });
      }
      
      const deviceTypeNode = root.get(deviceType)!;
      
      // Add each device under the device type
      Object.entries(devices).forEach(([deviceId, deviceData]) => {
        const deviceNode: TreeNode = {
          name: deviceId,
          fullPath: `${deviceType}/${deviceId}`,
          children: new Map(),
          value: deviceData.data,
          type: deviceData.type,
          timestamp: deviceData.timestamp,
          deviceType
        };
        
        // If the device data is an object, create child nodes for each property
        if (deviceData.data && typeof deviceData.data === 'object') {
          Object.entries(deviceData.data).forEach(([key, value]) => {
            const childNode: TreeNode = {
              name: key,
              fullPath: `${deviceType}/${deviceId}/${key}`,
              children: new Map(),
              value,
              type: typeof value,
              timestamp: deviceData.timestamp,
              deviceType
            };
            deviceNode.children.set(key, childNode);
          });
        }
        
        deviceTypeNode.children.set(deviceId, deviceNode);
      });
    });
    
    return root;
  }, [halSimData]);

  // Filter tree data based on search
  const filteredTreeData = useMemo(() => {
    if (!searchFilter.trim()) return treeData;
    
    const filtered = new Map<string, TreeNode>();
    const searchLower = searchFilter.toLowerCase();
    
    const shouldIncludeNode = (node: TreeNode): boolean => {
      // Check if node name matches
      if (node.name.toLowerCase().includes(searchLower)) return true;
      
      // Check if any child matches
      for (const child of node.children.values()) {
        if (shouldIncludeNode(child)) return true;
      }
      
      // Check if value matches (convert to string)
      if (node.value !== undefined) {
        const valueStr = String(node.value).toLowerCase();
        if (valueStr.includes(searchLower)) return true;
      }
      
      return false;
    };
    
    for (const [key, node] of treeData) {
      if (shouldIncludeNode(node)) {
        filtered.set(key, node);
      }
    }
    
    return filtered;
  }, [treeData, searchFilter]);

  // Flatten HAL simulation data for table view
  const flattenedData = useMemo(() => {
    const flattened: Array<{
      deviceType: string;
      deviceId: string;
      key: string;
      value: any;
      type: string;
      timestamp: number;
      fullPath: string;
    }> = [];

    Object.entries(halSimData).forEach(([deviceType, devices]) => {
      Object.entries(devices).forEach(([deviceId, deviceData]) => {
        if (deviceData.data && typeof deviceData.data === 'object') {
          Object.entries(deviceData.data).forEach(([key, value]) => {
            flattened.push({
              deviceType,
              deviceId,
              key,
              value,
              type: typeof value,
              timestamp: deviceData.timestamp,
              fullPath: `${deviceType}/${deviceId}/${key}`
            });
          });
        } else {
          flattened.push({
            deviceType,
            deviceId,
            key: 'value',
            value: deviceData.data,
            type: typeof deviceData.data,
            timestamp: deviceData.timestamp,
            fullPath: `${deviceType}/${deviceId}`
          });
        }
      });
    });

    return flattened;
  }, [halSimData]);

  // Filter flattened data for table view
  const filteredFlattenedData = useMemo(() => {
    if (!searchFilter.trim()) return flattenedData;

    const searchLower = searchFilter.toLowerCase();
    return flattenedData.filter(item =>
      item.deviceType.toLowerCase().includes(searchLower) ||
      item.deviceId.toLowerCase().includes(searchLower) ||
      item.key.toLowerCase().includes(searchLower) ||
      String(item.value).toLowerCase().includes(searchLower)
    );
  }, [flattenedData, searchFilter]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toFixed(3);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getValueColor = (value: any): string => {
    if (value === null || value === undefined) return '#666';
    if (typeof value === 'boolean') return value ? '#4caf50' : '#f44336';
    if (typeof value === 'number') return '#2196f3';
    if (typeof value === 'string') return '#ff9800';
    return '#9c27b0';
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'boolean': return '#4caf50';
      case 'number': return '#2196f3';
      case 'string': return '#ff9800';
      case 'object': return '#9c27b0';
      default: return '#666';
    }
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children.size > 0;
    const hasValue = node.value !== undefined;
    const isExpanded = expandedNodes.includes(node.fullPath);

    const handleToggle = () => {
      setExpandedNodes(prev =>
        isExpanded
          ? prev.filter(id => id !== node.fullPath)
          : [...prev, node.fullPath]
      );
    };

    return (
      <React.Fragment key={node.fullPath}>
        <ListItem
          disablePadding
          sx={{ pl: depth * 2 }}
        >
          <ListItemButton
            onClick={hasChildren ? handleToggle : undefined}
            sx={{
              py: 0.5,
              minHeight: 32,
              '&:hover': {
                backgroundColor: hasChildren ? 'action.hover' : 'transparent',
              },
              cursor: hasChildren ? 'pointer' : 'default',
            }}
          >
            {hasChildren && (
              <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                {isExpanded ? (
                  <ExpandMore fontSize="small" />
                ) : (
                  <ChevronRight fontSize="small" />
                )}
              </Box>
            )}
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      fontWeight: hasChildren ? 'bold' : 'normal',
                    }}
                  >
                    {node.name}
                  </Typography>
                  
                  {node.deviceType && depth === 0 && (
                    <Chip
                      label={node.deviceType}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        backgroundColor: '#1976d2',
                        color: 'white',
                      }}
                    />
                  )}
                  
                  {hasValue && !hasChildren && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: getValueColor(node.value),
                        ml: 'auto',
                      }}
                    >
                      {formatValue(node.value)}
                    </Typography>
                  )}
                </Box>
              }
              sx={{ my: 0 }}
            />
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {Array.from(node.children.values()).map(child => renderTreeNode(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const handleClearSearch = () => {
    setSearchFilter('');
  };

  const totalDevices = Object.values(halSimData).reduce((sum, devices) => sum + Object.keys(devices).length, 0);

  return (
    <Paper
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1,
          py: 0.25,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 1,
          backgroundColor: 'background.paper',
          minHeight: 32,
        }}
      >
        <Chip
          label={connected ? 'Connected' : 'Disconnected'}
          color={connected ? 'success' : 'error'}
          size="small"
          sx={{ height: 18, fontSize: '0.65rem' }}
        />

        <Chip
          label={`${totalDevices} devices`}
          size="small"
          variant="outlined"
          sx={{ height: 18, fontSize: '0.65rem' }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <AccountTree
              fontSize="small"
              sx={{
                color: viewMode === 'tree' ? 'primary.main' : 'text.secondary',
                fontSize: '16px'
              }}
            />
            <Switch
              checked={viewMode === 'table'}
              onChange={(e) => setViewMode(e.target.checked ? 'table' : 'tree')}
              size="small"
              sx={{
                width: 32,
                height: 16,
                padding: 0,
                '& .MuiSwitch-switchBase': {
                  padding: 0,
                  margin: '2px',
                  '&.Mui-checked': {
                    transform: 'translateX(16px)',
                  }
                },
                '& .MuiSwitch-thumb': {
                  width: 12,
                  height: 12,
                  backgroundColor: 'white',
                },
                '& .MuiSwitch-track': {
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  opacity: 1,
                  border: '1px solid rgba(255,255,255,0.2)',
                  '.Mui-checked.Mui-checked + &': {
                    backgroundColor: 'primary.main',
                    opacity: 0.7,
                  }
                }
              }}
            />
            <TableChart
              fontSize="small"
              sx={{
                color: viewMode === 'table' ? 'primary.main' : 'text.secondary',
                fontSize: '16px'
              }}
            />
          </Box>
        </Box>

        <TextField
          size="small"
          placeholder="Search..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchFilter && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            width: 140,
            '& .MuiOutlinedInput-root': {
              fontSize: '0.75rem',
              height: 28,
            },
            '& .MuiInputBase-input': {
              padding: '4px 8px',
            }
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!connected ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              Not connected to HAL simulation
            </Typography>
          </Box>
        ) : viewMode === 'tree' ? (
          filteredTreeData.size === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
              }}
            >
              <Typography variant="body2">
                {searchFilter ? 'No devices match search' : 'No simulation data available'}
              </Typography>
            </Box>
          ) : (
            <List
              dense
              sx={{
                py: 0,
                '& .MuiListItem-root': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
              }}
            >
              {Array.from(filteredTreeData.values()).map(node => renderTreeNode(node))}
            </List>
          )
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Device Type</TableCell>
                  <TableCell>Device ID</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFlattenedData.map((item, index) => (
                  <TableRow key={`${item.fullPath}-${index}`}>
                    <TableCell>
                      <Chip
                        label={item.deviceType}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: '#1976d2',
                          color: 'white',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {item.deviceId}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {item.key}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.type}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: getTypeColor(item.type),
                          color: 'white',
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: getValueColor(item.value),
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatValue(item.value)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
};

export default HalSimViewer;
