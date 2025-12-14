import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Fab,
  Tooltip,
} from '@mui/material';
import { challengeService, ChallengeWithProgress, ChallengeFilters } from '../services/challengeService';
import ImportChallengeDialog from '../components/challenges/ImportChallengeDialog';

// Simplified icons
const PlayIcon = () => <span>▶️</span>;
const CompletedIcon = () => <span>✅</span>;
const InProgressIcon = () => <span>🔄</span>;
const GitHubIcon = () => <span>📁</span>;

// Type for grouped challenges by repository
interface RepositoryGroup {
  repositoryId: string;
  name: string;
  description: string;
  author: string;
  githubUrl: string;
  challenges: ChallengeWithProgress[];
}

// Helper function to group challenges by repository
function groupChallengesByRepository(challenges: ChallengeWithProgress[]): RepositoryGroup[] {
  const groupMap = new Map<string, RepositoryGroup>();

  for (const challenge of challenges) {
    const repoId = challenge.github?.repositoryId || 'unknown';

    if (!groupMap.has(repoId)) {
      groupMap.set(repoId, {
        repositoryId: repoId,
        name: challenge.github?.name || 'Unknown Repository',
        description: challenge.github?.description || '',
        author: challenge.github?.author || '',
        githubUrl: challenge.github?.url || '',
        challenges: [],
      });
    }

    groupMap.get(repoId)!.challenges.push(challenge);
  }

  return Array.from(groupMap.values());
}

const ChallengesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Load challenges from service
  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simplified filters - removed category, difficulty
      const filters: ChallengeFilters = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();

      // Apply tab-based status filter
      if (activeTab === 1) filters.status = 'in_progress';
      if (activeTab === 2) filters.status = 'completed';

      const challengeData = await challengeService.getChallenges(filters);
      setChallenges(challengeData);
    } catch (err) {
      setError('Failed to load challenges. Please try again.');
      console.error('Error loading challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load challenges on component mount and when filters change
  useEffect(() => {
    loadChallenges();
  }, [activeTab, searchTerm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon />;
      case 'in_progress':
        return <InProgressIcon />;
      default:
        return <PlayIcon />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'locked':
        return 'Locked';
      default:
        return 'Start';
    }
  };

  // Filtering is now handled by the service

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, bgcolor: 'background.default' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Programming Challenges
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
        Master FRC programming through hands-on challenges
      </Typography>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="All Challenges" />
        <Tab label="In Progress" />
        <Tab label="Completed" />
      </Tabs>

      {/* Filters - simplified (removed category/difficulty) */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          label="Search challenges"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={loadChallenges} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Challenge Grid - Grouped by Repository */}
      {!loading && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {groupChallengesByRepository(challenges).map((repoGroup) => (
            <Box key={repoGroup.repositoryId}>
              {/* Repository Header */}
              <Box sx={{ mb: 2, p: 2, borderRadius: 1 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {repoGroup.name}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  {repoGroup.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {repoGroup.author && (
                    <Typography variant="body2" color="text.secondary">
                      By {repoGroup.author}
                    </Typography>
                  )}
                  {repoGroup.githubUrl && (
                    <Button
                      component="a"
                      href={repoGroup.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      startIcon={<GitHubIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      View on GitHub
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Challenges in this repository */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 3 }}>
                {repoGroup.challenges.map((challenge) => (
                  <Box key={challenge.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          {getStatusIcon(challenge.userProgress?.status || 'not_started')}
                        </Box>

                        <Typography variant="h6" component="h3" gutterBottom>
                          {challenge.metadata?.title || 'Untitled Challenge'}
                        </Typography>

                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                          {challenge.metadata?.description || ''}
                        </Typography>
                      </CardContent>

                      <CardActions>
                        <Button
                          component={Link}
                          to={`/challenge/${challenge.id}`}
                          startIcon={getStatusIcon(challenge.userProgress?.status || 'not_started')}
                          variant={(challenge.userProgress?.status || 'not_started') === 'completed' ? 'outlined' : 'contained'}
                        >
                          {getStatusText(challenge.userProgress?.status || 'not_started')}
                        </Button>
                      </CardActions>
                    </Card>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && challenges.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No challenges found matching your criteria
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setImportDialogOpen(true)}
            sx={{ mt: 2 }}
            startIcon={<GitHubIcon />}
          >
            Import Challenges from GitHub
          </Button>
        </Box>
      )}

      {/* Floating Action Button for Import */}
      <Tooltip title="Import challenges from GitHub">
        <Fab
          color="primary"
          aria-label="import challenges"
          onClick={() => setImportDialogOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <GitHubIcon />
        </Fab>
      </Tooltip>

      {/* Import Dialog */}
      <ImportChallengeDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportSuccess={() => {
          loadChallenges(); // Reload challenges after successful import
        }}
      />
    </Container>
  );
};

export default ChallengesPage;
