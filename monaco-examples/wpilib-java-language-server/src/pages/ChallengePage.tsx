import React from 'react';
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
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PlayArrow as StartIcon,
  School as LearningIcon,
} from '@mui/icons-material';

// This will eventually integrate with your existing Monaco Editor setup
const ChallengePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // Mock data - this would come from your API
  const challenge = {
    id: parseInt(id || '1'),
    title: 'Hello Robot World',
    description: 'Get started with your first robot program and learn the fundamentals of FRC programming.',
    difficulty: 'Beginner',
    category: 'Basics',
    estimatedTime: '15 min',
    status: 'not_started',
    learningObjectives: [
      'Understand the basic structure of an FRC robot program',
      'Learn how to use the Robot class and its methods',
      'Implement basic robot initialization and periodic functions',
      'Test your code using the robot simulator',
    ],
    instructions: `
# Hello Robot World Challenge

Welcome to your first FRC programming challenge! In this challenge, you'll create your first robot program and learn the fundamentals of FRC programming.

## What You'll Learn
- Basic structure of an FRC robot program
- The Robot class and its lifecycle methods
- How to use the robot simulator to test your code

## Your Task
1. Create a basic robot program that prints "Hello, Robot World!" when the robot is initialized
2. Add a counter that increments every time the robot's periodic function is called
3. Print the counter value to the console every 50 iterations
4. Test your program using the simulator

## Getting Started
The starter code is already loaded in the editor. Look for the TODO comments to see where you need to add your code.

## Success Criteria
- [ ] Robot prints "Hello, Robot World!" during initialization
- [ ] Counter increments properly in the periodic function
- [ ] Counter value is printed every 50 iterations
- [ ] Code compiles without errors
- [ ] Simulation runs successfully

Good luck, and welcome to FRC programming!
    `,
    hints: [
      'Use System.out.println() to print messages to the console',
      'The robotInit() method is called once when the robot starts',
      'The robotPeriodic() method is called every 20ms while the robot is running',
      'Use the modulo operator (%) to check if the counter is divisible by 50',
    ],
  };

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
        startIcon={<BackIcon />}
        sx={{ mb: 3 }}
      >
        Back to Challenges
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
          startIcon={<StartIcon />}
          onClick={handleStartChallenge}
          sx={{ mr: 2 }}
        >
          Start Challenge
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<LearningIcon />}
        >
          View Solution
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
                    <Typography key={index} paragraph>
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
              {challenge.hints.map((hint, index) => (
                <Typography key={index} component="li" sx={{ mb: 1 }} color="text.secondary">
                  {hint}
                </Typography>
              ))}
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
                <strong>Status:</strong> {challenge.status.replace('_', ' ').toUpperCase()}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default ChallengePage;
