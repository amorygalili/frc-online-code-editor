import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Grid,
} from '@mui/material';
import {
  useNTConnection,
  useNTValue,
  useNTKeys,
  useNt4Client,
} from '../nt4/useNetworktables';

export const NetworkTablesDemo: React.FC = () => {
  const connected = useNTConnection();
  const client = useNt4Client();
  const keys = useNTKeys();
  
  // Example NetworkTables values
  const [testString, setTestString] = useNTValue<string>('/test/string', 'Hello World');
  const [testNumber, setTestNumber] = useNTValue<number>('/test/number', 42);
  const [testBoolean, setTestBoolean] = useNTValue<boolean>('/test/boolean', false);
  
  // Local state for input fields
  const [stringInput, setStringInput] = useState('');
  const [numberInput, setNumberInput] = useState('');

  const handleSetString = () => {
    if (stringInput.trim()) {
      setTestString(stringInput);
      setStringInput('');
    }
  };

  const handleSetNumber = () => {
    const num = parseFloat(numberInput);
    if (!isNaN(num)) {
      setTestNumber(num);
      setNumberInput('');
    }
  };

  const handleToggleBoolean = () => {
    setTestBoolean(!testBoolean);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        NetworkTables Demo
      </Typography>
      
      {/* Connection Status */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Connection Status
          </Typography>
          <Chip 
            label={connected ? 'Connected' : 'Disconnected'} 
            color={connected ? 'success' : 'error'} 
          />
        </CardContent>
      </Card>

      {/* Test Values */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                String Value
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Current: {testString || 'undefined'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={stringInput}
                onChange={(e) => setStringInput(e.target.value)}
                placeholder="Enter new string"
                sx={{ mb: 1 }}
              />
              <Button 
                variant="contained" 
                size="small" 
                onClick={handleSetString}
                disabled={!connected}
              >
                Set String
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Number Value
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Current: {testNumber ?? 'undefined'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                placeholder="Enter new number"
                sx={{ mb: 1 }}
              />
              <Button 
                variant="contained" 
                size="small" 
                onClick={handleSetNumber}
                disabled={!connected}
              >
                Set Number
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Boolean Value
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Current: {testBoolean?.toString() || 'undefined'}
              </Typography>
              <Button 
                variant="contained" 
                size="small" 
                onClick={handleToggleBoolean}
                disabled={!connected}
              >
                Toggle Boolean
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Available Keys */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available NetworkTables Keys ({keys.length})
          </Typography>
          {keys.length > 0 ? (
            <List dense>
              {keys.slice(0, 10).map((key) => (
                <ListItem key={key}>
                  <ListItemText primary={key} />
                </ListItem>
              ))}
              {keys.length > 10 && (
                <ListItem>
                  <ListItemText 
                    primary={`... and ${keys.length - 10} more keys`} 
                    sx={{ fontStyle: 'italic' }}
                  />
                </ListItem>
              )}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No keys available
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
