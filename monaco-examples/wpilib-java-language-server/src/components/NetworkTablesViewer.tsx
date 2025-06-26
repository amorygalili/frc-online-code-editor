import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  ExpandMore,
  ChevronRight,
  Search,
  Clear,
  Refresh,
  TableChart,
  AccountTree,
} from '@mui/icons-material';
import {
  useNTConnection,
  useNTKeys,
  useNt4TopicData,
} from '../nt4/useNetworktables';

interface NetworkTablesViewerProps {
  className?: string;
}

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  value?: unknown;
  type?: string;
  timestamp?: number;
}

export const NetworkTablesViewer: React.FC<NetworkTablesViewerProps> = ({
  className
}) => {
  const connected = useNTConnection();
  const keys = useNTKeys();
  const topicData = useNt4TopicData();
  
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  // Build tree structure from keys
  const treeData = useMemo(() => {
    const root = new Map<string, TreeNode>();
    
    keys.forEach(key => {
      const parts = key.split('/').filter(part => part.length > 0);
      let currentLevel = root;
      let currentPath = '';
      
      parts.forEach((part, index) => {
        currentPath += '/' + part;
        
        if (!currentLevel.has(part)) {
          currentLevel.set(part, {
            name: part,
            fullPath: currentPath,
            children: new Map(),
          });
        }
        
        const node = currentLevel.get(part)!;
        
        // If this is the last part, add the value data
        if (index === parts.length - 1) {
          const data = topicData.get(key);
          if (data) {
            node.value = data.value;
            node.type = data.topic.type;
            node.timestamp = data.timestamp;
          }
        }
        
        currentLevel = node.children;
      });
    });
    
    return root;
  }, [keys, topicData]);

  // Filter keys based on search
  const filteredKeys = useMemo(() => {
    if (!searchFilter.trim()) return keys;
    const filter = searchFilter.toLowerCase();
    return keys.filter(key => key.toLowerCase().includes(filter));
  }, [keys, searchFilter]);

  // Filter tree data based on search
  const filteredTreeData = useMemo(() => {
    if (!searchFilter.trim()) return treeData;
    
    const filtered = new Map<string, TreeNode>();
    const filter = searchFilter.toLowerCase();
    
    const addNodeIfMatches = (node: TreeNode, parentMap: Map<string, TreeNode>) => {
      if (node.fullPath.toLowerCase().includes(filter)) {
        parentMap.set(node.name, {
          ...node,
          children: new Map(node.children)
        });
        return true;
      }
      
      // Check children
      let hasMatchingChild = false;
      const filteredChildren = new Map<string, TreeNode>();
      
      for (const [childName, childNode] of node.children) {
        if (addNodeIfMatches(childNode, filteredChildren)) {
          hasMatchingChild = true;
        }
      }
      
      if (hasMatchingChild) {
        parentMap.set(node.name, {
          ...node,
          children: filteredChildren
        });
        return true;
      }
      
      return false;
    };
    
    for (const [name, node] of treeData) {
      addNodeIfMatches(node, filtered);
    }
    
    return filtered;
  }, [treeData, searchFilter]);

  const clearSearch = () => {
    setSearchFilter('');
  };

  const formatValue = (value: unknown, type?: string): string => {
    if (value === null || value === undefined) return 'null';
    
    switch (type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'double':
      case 'float':
        return typeof value === 'number' ? value.toFixed(3) : String(value);
      case 'string':
        return `"${value}"`;
      default:
        return String(value);
    }
  };

  const getTypeColor = (type?: string): string => {
    switch (type) {
      case 'boolean': return '#4caf50';
      case 'double':
      case 'float': return '#2196f3';
      case 'string': return '#ff9800';
      case 'int': return '#9c27b0';
      default: return '#757575';
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {hasChildren ? (
                isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />
              ) : (
                <Box sx={{ width: 20 }} />
              )}

              <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 0 }}>
                {node.name}
              </Typography>

              {hasValue && (
                <>
                  <Chip
                    label={node.type}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.7rem',
                      backgroundColor: getTypeColor(node.type),
                      color: 'white',
                      ml: 1,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      ml: 1,
                    }}
                  >
                    {formatValue(node.value, node.type)}
                  </Typography>
                </>
              )}
            </Box>
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
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          NetworkTables
        </Typography>
        
        <Chip
          label={connected ? 'Connected' : 'Disconnected'}
          color={connected ? 'success' : 'error'}
          size="small"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={viewMode === 'table'}
              onChange={(e) => setViewMode(e.target.checked ? 'table' : 'tree')}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {viewMode === 'tree' ? <AccountTree fontSize="small" /> : <TableChart fontSize="small" />}
              <Typography variant="body2">
                {viewMode === 'tree' ? 'Tree' : 'Table'}
              </Typography>
            </Box>
          }
        />
        
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
                <IconButton size="small" onClick={clearSearch}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: 200 }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
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
            <Typography variant="body1">
              Not connected to NetworkTables server
            </Typography>
          </Box>
        ) : keys.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body1">
              No NetworkTables data available
            </Typography>
          </Box>
        ) : viewMode === 'tree' ? (
          <List
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              py: 0,
            }}
          >
            {Array.from(filteredTreeData.values()).map(node => renderTreeNode(node))}
          </List>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredKeys.map(key => {
                  const data = topicData.get(key);
                  return (
                    <TableRow key={key}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {key}
                      </TableCell>
                      <TableCell>
                        {data?.topic.type && (
                          <Chip
                            label={data.topic.type}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              backgroundColor: getTypeColor(data.topic.type),
                              color: 'white',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {data ? formatValue(data.value, data.topic.type) : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {data?.timestamp ? new Date(data.timestamp / 1000).toLocaleTimeString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
};

export default NetworkTablesViewer;
