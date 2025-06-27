import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
} from '@mui/material';
import {
  Code as CodeIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: <CodeIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Interactive Coding',
      description: 'Write and test FRC robot code directly in your browser with our Monaco editor.',
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Learn by Doing',
      description: 'Progressive challenges that teach FRC programming concepts step by step.',
    },
    {
      icon: <TrophyIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      title: 'Track Progress',
      description: 'Monitor your learning journey and unlock new challenges as you advance.',
    },
  ];

  const sampleChallenges = [
    {
      id: 1,
      title: 'Hello Robot World',
      difficulty: 'Beginner',
      category: 'Basics',
      description: 'Get started with your first robot program and learn the fundamentals.',
      estimatedTime: '15 min',
    },
    {
      id: 2,
      title: 'Motor Control Basics',
      difficulty: 'Beginner',
      category: 'Basics',
      description: 'Learn how to control motors and create basic drive systems.',
      estimatedTime: '30 min',
    },
    {
      id: 3,
      title: 'Sensor Integration',
      difficulty: 'Intermediate',
      category: 'Sensors',
      description: 'Work with encoders, gyroscopes, and other sensors.',
      estimatedTime: '45 min',
    },
  ];

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

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          py: 8,
          mb: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
                FRC Programming Challenges
              </Typography>
              <Typography variant="h5" component="p" sx={{ mb: 4, opacity: 0.9 }}>
                Master robotics programming through hands-on challenges designed for FRC teams and students.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  component={Link}
                  to="/challenges"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                  startIcon={<PlayIcon />}
                >
                  Start Coding
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <CodeIcon sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h6">
                  Browser-based FRC Development Environment
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Why Choose Our Platform?
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 6 }}
          >
            Everything you need to learn FRC programming in one place
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h5" component="h3" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Sample Challenges Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Featured Challenges
          </Typography>
          <Typography
            variant="h6"
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 6 }}
          >
            Get a taste of what you'll be learning
          </Typography>

          <Grid container spacing={3}>
            {sampleChallenges.map((challenge) => (
              <Grid item xs={12} md={4} key={challenge.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={challenge.difficulty}
                        color={getDifficultyColor(challenge.difficulty) as any}
                        size="small"
                      />
                      <Chip label={challenge.category} variant="outlined" size="small" />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {challenge.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {challenge.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ⏱️ {challenge.estimatedTime}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      component={Link}
                      to={`/challenge/${challenge.id}`}
                      size="small"
                      startIcon={<PlayIcon />}
                    >
                      Try Challenge
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              component={Link}
              to="/challenges"
              variant="outlined"
              size="large"
            >
              View All Challenges
            </Button>
          </Box>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            bgcolor: 'grey.50',
            borderRadius: 2,
            p: 6,
            textAlign: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Start Your FRC Journey?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Join thousands of students learning robotics programming
          </Typography>
          <Button
            component={Link}
            to="/challenges"
            variant="contained"
            size="large"
            startIcon={<PlayIcon />}
          >
            Get Started Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
