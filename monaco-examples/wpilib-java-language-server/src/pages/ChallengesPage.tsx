import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
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
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  CheckCircle as CompletedIcon,
  Schedule as InProgressIcon,
  Lock as LockedIcon,
} from '@mui/icons-material';

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  estimatedTime: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  progress: number;
  prerequisites?: number[];
}

const ChallengesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [activeTab, setActiveTab] = useState(0);

  // Mock data - this would come from your API
  const challenges: Challenge[] = [
    {
      id: 1,
      title: 'Hello Robot World',
      description: 'Get started with your first robot program and learn the fundamentals of FRC programming.',
      difficulty: 'Beginner',
      category: 'Basics',
      estimatedTime: '15 min',
      status: 'completed',
      progress: 100,
    },
    {
      id: 2,
      title: 'Motor Control Basics',
      description: 'Learn how to control motors and create basic drive systems for your robot.',
      difficulty: 'Beginner',
      category: 'Basics',
      estimatedTime: '30 min',
      status: 'in_progress',
      progress: 65,
    },
    {
      id: 3,
      title: 'Sensor Reading Fundamentals',
      description: 'Understand how to read data from various sensors and use it in your programs.',
      difficulty: 'Beginner',
      category: 'Sensors',
      estimatedTime: '25 min',
      status: 'not_started',
      progress: 0,
    },
    {
      id: 4,
      title: 'Encoder-based Movement',
      description: 'Use encoders to create precise movement and positioning systems.',
      difficulty: 'Intermediate',
      category: 'Sensors',
      estimatedTime: '45 min',
      status: 'locked',
      progress: 0,
      prerequisites: [3],
    },
    {
      id: 5,
      title: 'Gyroscope Navigation',
      description: 'Implement gyroscope-based navigation and rotation control.',
      difficulty: 'Intermediate',
      category: 'Sensors',
      estimatedTime: '40 min',
      status: 'locked',
      progress: 0,
      prerequisites: [3],
    },
    {
      id: 6,
      title: 'PID Control Implementation',
      description: 'Master PID controllers for precise robot movement and control.',
      difficulty: 'Advanced',
      category: 'Control Systems',
      estimatedTime: '60 min',
      status: 'locked',
      progress: 0,
      prerequisites: [4, 5],
    },
  ];

  const categories = ['all', 'Basics', 'Sensors', 'Control Systems', 'Autonomous', 'Vision'];
  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];

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
        return <CompletedIcon color="success" />;
      case 'in_progress':
        return <InProgressIcon color="warning" />;
      case 'locked':
        return <LockedIcon color="disabled" />;
      default:
        return <PlayIcon color="primary" />;
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

  const filteredChallenges = challenges.filter((challenge) => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || challenge.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || challenge.difficulty === selectedDifficulty;
    
    if (activeTab === 1) {
      return matchesSearch && matchesCategory && matchesDifficulty && challenge.status === 'in_progress';
    } else if (activeTab === 2) {
      return matchesSearch && matchesCategory && matchesDifficulty && challenge.status === 'completed';
    }
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
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
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search challenges"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
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
          </Grid>
          <Grid item xs={12} md={4}>
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
          </Grid>
        </Grid>
      </Box>

      {/* Challenge Grid */}
      <Grid container spacing={3}>
        {filteredChallenges.map((challenge) => (
          <Grid item xs={12} md={6} lg={4} key={challenge.id}>
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
          </Grid>
        ))}
      </Grid>

      {filteredChallenges.length === 0 && (
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
