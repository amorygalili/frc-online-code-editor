import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Chip,
  Breadcrumbs,
  Alert,
  CircularProgress,
} from '@mui/material';
import { challengeService, ChallengeWithProgress } from '../services/challengeService';
// Simplified icons
const BackIcon = () => <span>←</span>;
const StartIcon = () => <span>▶️</span>;
const LearningIcon = () => <span>📚</span>;

// This will eventually integrate with your existing Monaco Editor setup
const ChallengePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challenge, setChallenge] = useState<ChallengeWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load challenge data
  useEffect(() => {
    const loadChallenge = async () => {
      if (!id) {
        setError('Challenge ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const challengeData = await challengeService.getChallenge(id);

        if (!challengeData) {
          setError('Challenge not found');
        } else {
          setChallenge(challengeData);
        }
      } catch (err) {
        setError('Failed to load challenge');
        console.error('Error loading challenge:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button component={Link} to="/challenges" variant="outlined">
          Back to Challenges
        </Button>
      </Container>
    );
  }

  // Challenge not found
  if (!challenge) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Challenge not found
        </Alert>
        <Button component={Link} to="/challenges" variant="outlined">
          Back to Challenges
        </Button>
      </Container>
    );
  }

  // Use the loaded challenge data

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleStartChallenge = () => {
    // This would navigate to the editor view or create a new session
    // For now, we'll just show an alert
    alert('Starting challenge... This would open the Monaco editor with the challenge code!');
  };

  // Final safety check - this should not happen due to earlier checks
  if (!challenge) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Home
        </Link>
        <Link to="/challenges" style={{ textDecoration: 'none', color: 'inherit' }}>
          Challenges
        </Link>
        <Typography color="text.primary">{challenge.title}</Typography>
      </Breadcrumbs>

      {/* Back Button */}
      <Button
        component={Link}
        to="/challenges"
        sx={{ mb: 3 }}
      >
        <BackIcon /> Back to Challenges
      </Button>

      {/* Challenge Header */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip
            label={challenge.difficulty}
            color={getDifficultyColor(challenge.difficulty) as any}
          />
          <Chip label={challenge.category} variant="outlined" />
          <Chip label={`⏱️ ${challenge.estimatedTime}`} variant="outlined" />
        </Box>

        <Typography variant="h3" component="h1" gutterBottom>
          {challenge.title}
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          {challenge.description}
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={handleStartChallenge}
          sx={{ mr: 2 }}
        >
          <StartIcon /> Start Challenge
        </Button>

        <Button
          variant="outlined"
          size="large"
        >
          <LearningIcon /> View Solution
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Main Content */}
        <Box sx={{ flex: 2 }}>
          {/* Instructions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Instructions
            </Typography>
            <Box
              sx={{
                '& h1': { fontSize: '1.5rem', mt: 2, mb: 1 },
                '& h2': { fontSize: '1.25rem', mt: 2, mb: 1 },
                '& h3': { fontSize: '1.1rem', mt: 2, mb: 1 },
                '& p': { mb: 1 },
                '& ul': { pl: 2, mb: 2 },
                '& li': { mb: 0.5 },
                '& code': {
                  bgcolor: 'grey.100',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                },
              }}
            >
              {challenge.instructions.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return (
                    <Typography key={index} variant="h4" component="h2" sx={{ mt: 2, mb: 1 }}>
                      {line.substring(2)}
                    </Typography>
                  );
                } else if (line.startsWith('## ')) {
                  return (
                    <Typography key={index} variant="h5" component="h3" sx={{ mt: 2, mb: 1 }}>
                      {line.substring(3)}
                    </Typography>
                  );
                } else if (line.startsWith('- [ ]')) {
                  return (
                    <Typography key={index} component="div" sx={{ mb: 0.5 }}>
                      ☐ {line.substring(5)}
                    </Typography>
                  );
                } else if (line.startsWith('- ')) {
                  return (
                    <Typography key={index} component="div" sx={{ mb: 0.5, ml: 2 }}>
                      • {line.substring(2)}
                    </Typography>
                  );
                } else if (line.match(/^\d+\. /)) {
                  return (
                    <Typography key={index} component="div" sx={{ mb: 0.5, ml: 2 }}>
                      {line}
                    </Typography>
                  );
                } else if (line.trim()) {
                  return (
                    <Typography key={index} sx={{ mb: 2 }}>
                      {line}
                    </Typography>
                  );
                } else {
                  return <Box key={index} sx={{ height: 8 }} />;
                }
              })}
            </Box>
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box sx={{ flex: 1 }}>
          {/* Learning Objectives */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Learning Objectives
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {challenge.learningObjectives.map((objective, index) => (
                <Typography key={index} component="li" sx={{ mb: 1 }}>
                  {objective}
                </Typography>
              ))}
            </Box>
          </Paper>

          {/* Hints */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Hints
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Stuck? Here are some hints to help you along!
            </Alert>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {challenge.hints?.map((hint, index) => (
                <Typography key={index} component="li" sx={{ mb: 1 }} color="text.secondary">
                  {hint}
                </Typography>
              )) || (
                <Typography color="text.secondary">
                  No hints available for this challenge.
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Challenge Stats */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Challenge Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Difficulty:</strong> {challenge.difficulty}
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> {challenge.category}
              </Typography>
              <Typography variant="body2">
                <strong>Estimated Time:</strong> {challenge.estimatedTime}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {challenge.status ? challenge.status.replace('_', ' ').toUpperCase() : 'NOT STARTED'}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default ChallengePage;
