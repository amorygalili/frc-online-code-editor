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
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { challengeService, ChallengeWithProgress, ChallengeFilters } from '../services/challengeService';

// Simplified icons
const PlayIcon = () => <span>▶️</span>;
const CompletedIcon = () => <span>✅</span>;
const InProgressIcon = () => <span>🔄</span>;
const LockedIcon = () => <span>🔒</span>;
const SearchIcon = () => <span>🔍</span>;

const ChallengesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load challenges from service
  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: ChallengeFilters = {};
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (selectedDifficulty !== 'all') filters.difficulty = selectedDifficulty;
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
  }, [activeTab, selectedCategory, selectedDifficulty, searchTerm]);

  // Get categories and difficulties from service
  const categories = challengeService.getCategories().map(c => c.toLowerCase());
  const difficulties = challengeService.getDifficulties().map(d => d.toLowerCase());

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CompletedIcon />;
      case 'in_progress':
        return <InProgressIcon />;
      case 'locked':
        return <LockedIcon />;
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
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

      {/* Filters */}
      <Box sx={{ mb: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <TextField
            fullWidth
            label="Search challenges"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <FormControl fullWidth>
            <InputLabel>Difficulty</InputLabel>
            <Select
              value={selectedDifficulty}
              label="Difficulty"
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              {difficulties.map((difficulty) => (
                <MenuItem key={difficulty} value={difficulty}>
                  {difficulty === 'all' ? 'All Difficulties' : difficulty}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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

      {/* Challenge Grid */}
      {!loading && !error && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 3 }}>
          {challenges.map((challenge) => (
          <Box key={challenge.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                opacity: challenge.status === 'locked' ? 0.6 : 1,
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getStatusIcon(challenge.status)}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={challenge.difficulty}
                      color={getDifficultyColor(challenge.difficulty) as any}
                      size="small"
                    />
                    <Chip label={challenge.category} variant="outlined" size="small" />
                  </Box>
                </Box>
                
                <Typography variant="h6" component="h3" gutterBottom>
                  {challenge.title}
                </Typography>
                
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {challenge.description}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  ⏱️ {challenge.estimatedTime}
                </Typography>

                {challenge.status === 'in_progress' && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Progress</Typography>
                      <Typography variant="body2">{challenge.progress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={challenge.progress} />
                  </Box>
                )}

                {challenge.prerequisites && challenge.prerequisites.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Prerequisites: Complete challenges {challenge.prerequisites.join(', ')}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions>
                <Button
                  component={Link}
                  to={challenge.status === 'locked' ? '#' : `/challenge/${challenge.id}`}
                  disabled={challenge.status === 'locked'}
                  startIcon={getStatusIcon(challenge.status)}
                  variant={challenge.status === 'completed' ? 'outlined' : 'contained'}
                >
                  {getStatusText(challenge.status)}
                </Button>
              </CardActions>
            </Card>
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
        </Box>
      )}
    </Container>
  );
};

export default ChallengesPage;
