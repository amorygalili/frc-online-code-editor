import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Breadcrumbs,
  Alert,
  CircularProgress,
} from '@mui/material';
import { challengeService, ChallengeWithProgress } from '../services/challengeService';
import { useAuth } from '../contexts/AuthContext';
import InstructionsPanel from '../components/InstructionsPanel';
// Simplified icons
const BackIcon = () => <span>←</span>;
const StartIcon = () => <span>▶️</span>;

// This will eventually integrate with your existing Monaco Editor setup
const ChallengePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingChallenge, setStartingChallenge] = useState(false);

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

  const handleStartChallenge = async () => {
    if (!challenge || !isAuthenticated) {
      // Redirect to login if not authenticated
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      return;
    }

    try {
      setStartingChallenge(true);

      // Navigate to the editor page - the ChallengeEditorPage will handle session creation
      navigate(`/challenge/${challenge.id}/editor`);

    } catch (err) {
      console.error('Error starting challenge:', err);
      setError(err instanceof Error ? err.message : 'Failed to start challenge');
    } finally {
      setStartingChallenge(false);
    }
  };

  // Final safety check - this should not happen due to earlier checks
  if (!challenge) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4, backgroundColor: 'background.default' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Home
        </Link>
        <Link to="/challenges" style={{ textDecoration: 'none', color: 'inherit' }}>
          Challenges
        </Link>
        <Typography color="text.primary">{challenge.metadata?.title || 'Challenge'}</Typography>
      </Breadcrumbs>

      {/* Back Button */}
      <Button
        component={Link}
        to="/challenges"
        sx={{ mb: 3 }}
      >
        <BackIcon /> Back to Challenges
      </Button>

      {/* Challenge Header - simplified (removed difficulty/category/estimatedTime) */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h3" component="h1">
            {challenge.metadata?.title || 'Untitled Challenge'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 1,
              bgcolor: challenge.userProgress?.status === 'completed' ? 'success.main' :
                       challenge.userProgress?.status === 'in_progress' ? 'warning.main' : 'grey.600',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {challenge.userProgress?.status ? challenge.userProgress.status.replace('_', ' ').toUpperCase() : 'NOT STARTED'}
          </Typography>
        </Box>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          {challenge.metadata?.description || ''}
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={handleStartChallenge}
          disabled={startingChallenge || !isAuthenticated}
          sx={{ mr: 2 }}
        >
          {startingChallenge ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Starting...
            </>
          ) : (
            <>
              <StartIcon /> {isAuthenticated ? 'Start Challenge' : 'Login to Start'}
            </>
          )}
        </Button>
      </Paper>

      <InstructionsPanel instructions={challenge.metadata.files.instructionsContent} />
    </Container>
  );
};

export default ChallengePage;
