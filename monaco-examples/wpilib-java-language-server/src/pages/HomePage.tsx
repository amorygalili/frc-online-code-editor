import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
// Simplified icons to avoid build issues
const CodeIcon = () => <span>💻</span>;
const SchoolIcon = () => <span>🎓</span>;
const TrophyIcon = () => <span>🏆</span>;
const PlayIcon = () => <span>▶️</span>;

const HomePage: React.FC = () => {
  const { user, isAuthenticated, isConfigured } = useAuth();

  const features = [
    {
      icon: <CodeIcon />,
      title: 'Interactive Coding',
      description: 'Write and test FRC robot code directly in your browser with our Monaco editor.',
    },
    {
      icon: <SchoolIcon />,
      title: 'Learn by Doing',
      description: 'Progressive challenges that teach FRC programming concepts step by step.',
    },
    {
      icon: <TrophyIcon />,
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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 4 }}>
            <Box sx={{ flex: 1 }}>
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
                >
                  <PlayIcon /> Start Coding
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
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ fontSize: 80, mb: 2 }}><CodeIcon /></Box>
                <Typography variant="h6">
                  Browser-based FRC Development Environment
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {/* Authentication Status Indicator */}
        {isConfigured && isAuthenticated && user && (
          <Alert
            severity="success"
            sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <span>✅</span>
            <Box>
              <Typography variant="body1" component="span" sx={{ fontWeight: 'bold' }}>
                Welcome back, {user.name}!
              </Typography>
              <Typography variant="body2" component="div" sx={{ opacity: 0.8 }}>
                You're signed in as {user.email}
              </Typography>
            </Box>
          </Alert>
        )}

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
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 4 }}>
            {features.map((feature, index) => (
              <Card key={index} sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                <CardContent>
                  <Box sx={{ mb: 2, fontSize: 40 }}>{feature.icon}</Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
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

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 3 }}>
            {sampleChallenges.map((challenge) => (
              <Card key={challenge.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  >
                    <PlayIcon /> Try Challenge
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>

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
