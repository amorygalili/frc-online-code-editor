// Dialog component for importing challenges from GitHub repositories

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

import { challengeService, ImportResult } from '../../services/challengeService';

interface ImportChallengeDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ImportChallengeDialog({ 
  open, 
  onClose, 
  onImportSuccess 
}: ImportChallengeDialogProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!githubUrl.trim()) {
      setError('GitHub URL is required');
      return;
    }

    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await challengeService.importGitHubChallenges(
        githubUrl.trim(),
        branch.trim() || 'main',
        accessToken.trim() || undefined
      );

      setImportResult(result);
      
      if (result.status === 'success') {
        // Auto-close after successful import
        setTimeout(() => {
          onImportSuccess();
          handleClose();
        }, 3000);
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGithubUrl('');
    setBranch('main');
    setAccessToken('');
    setError(null);
    setImportResult(null);
    setLoading(false);
    onClose();
  };

  const isValidGitHubUrl = (url: string) => {
    return /^https:\/\/github\.com\/[^\/]+\/[^\/]+/.test(url);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <GitHubIcon />
          Import Challenges from GitHub
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Instructions */}
          <Alert severity="info">
            Import challenges from a GitHub repository. The repository must contain a 
            <code style={{ margin: '0 4px' }}>challenges.json</code> file in the root 
            directory with challenge metadata.
          </Alert>

          {/* GitHub URL Input */}
          <TextField
            label="GitHub Repository URL"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            fullWidth
            required
            error={githubUrl.length > 0 && !isValidGitHubUrl(githubUrl)}
            helperText={
              githubUrl.length > 0 && !isValidGitHubUrl(githubUrl)
                ? 'Please enter a valid GitHub repository URL'
                : 'Enter the full GitHub repository URL'
            }
            disabled={loading}
          />

          {/* Branch Input */}
          <TextField
            label="Branch"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            fullWidth
            helperText="Branch to import challenges from (default: main)"
            disabled={loading}
          />

          {/* Access Token Input */}
          <TextField
            label="Access Token (Optional)"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            type="password"
            fullWidth
            helperText="GitHub personal access token for private repositories"
            disabled={loading}
          />

          {/* Error Display */}
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* Import Results */}
          {importResult && (
            <Box>
              <Alert 
                severity={importResult.status === 'success' ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                {importResult.message}
              </Alert>

              {importResult.challenges.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      Challenge Import Details ({importResult.challenges.length} challenges)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {importResult.challenges.map((challenge, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {challenge.status === 'imported' ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <ErrorIcon color="error" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={challenge.title}
                            secondary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="caption" color="textSecondary">
                                  ID: {challenge.id}
                                </Typography>
                                <Chip
                                  label={challenge.status}
                                  size="small"
                                  color={challenge.status === 'imported' ? 'success' : 'error'}
                                  variant="outlined"
                                />
                                {challenge.error && (
                                  <Typography variant="caption" color="error">
                                    {challenge.error}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {importResult?.status === 'success' ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={loading || !githubUrl.trim() || !isValidGitHubUrl(githubUrl)}
          startIcon={loading ? <CircularProgress size={20} /> : <GitHubIcon />}
        >
          {loading ? 'Importing...' : 'Import Challenges'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
