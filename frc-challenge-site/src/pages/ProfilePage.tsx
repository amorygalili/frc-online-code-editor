import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
// Simplified icons
const CompletedIcon = () => <span>✅</span>;
const InProgressIcon = () => <span>🔄</span>;
const TrophyIcon = () => <span>🏆</span>;
const TimerIcon = () => <span>⏱️</span>;
const CodeIcon = () => <span>💻</span>;

const ProfilePage: React.FC = () => {
  // Mock user data - this would come from your authentication system
  const user = {
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    avatar: '', // Would be from Google profile
    joinDate: '2024-01-15',
    totalChallenges: 12,
    completedChallenges: 8,
    inProgressChallenges: 2,
    totalTimeSpent: '4h 32m',
    currentStreak: 5,
    longestStreak: 12,
  };

  const stats = [
    {
      label: 'Challenges Completed',
      value: user.completedChallenges,
      total: user.totalChallenges,
      icon: <CompletedIcon />,
      color: 'success',
    },
    {
      label: 'In Progress',
      value: user.inProgressChallenges,
      icon: <InProgressIcon />,
      color: 'warning',
    },
    {
      label: 'Time Spent Learning',
      value: user.totalTimeSpent,
      icon: <TimerIcon />,
      color: 'info',
    },
    {
      label: 'Current Streak',
      value: `${user.currentStreak} days`,
      icon: <TrophyIcon />,
      color: 'primary',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'completed',
      title: 'Motor Control Basics',
      date: '2024-01-20',
      category: 'Basics',
    },
    {
      id: 2,
      type: 'started',
      title: 'Sensor Reading Fundamentals',
      date: '2024-01-19',
      category: 'Sensors',
    },
    {
      id: 3,
      type: 'completed',
      title: 'Hello Robot World',
      date: '2024-01-18',
      category: 'Basics',
    },
  ];

  const achievements = [
    {
      id: 1,
      title: 'First Steps',
      description: 'Complete your first challenge',
      earned: true,
      date: '2024-01-18',
    },
    {
      id: 2,
      title: 'Getting Started',
      description: 'Complete 5 challenges',
      earned: true,
      date: '2024-01-20',
    },
    {
      id: 3,
      title: 'Dedicated Learner',
      description: 'Maintain a 7-day streak',
      earned: false,
    },
    {
      id: 4,
      title: 'Sensor Master',
      description: 'Complete all sensor challenges',
      earned: false,
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CompletedIcon />;
      case 'started':
        return <InProgressIcon />;
      default:
        return <CodeIcon />;
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case 'completed':
        return 'Completed';
      case 'started':
        return 'Started';
      default:
        return 'Activity';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Profile
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
        {/* User Info */}
        <Box sx={{ flex: { md: '0 0 300px' } }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}
              src={user.avatar}
            >
              {user.name.split(' ').map(n => n[0]).join('')}
            </Avatar>
            <Typography variant="h5" gutterBottom>
              {user.name}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              {user.email}
            </Typography>
            <Chip
              label={`Member since ${new Date(user.joinDate).toLocaleDateString()}`}
              variant="outlined"
              size="small"
            />
          </Paper>

          {/* Achievements */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Achievements
            </Typography>
            <List dense>
              {achievements.map((achievement) => (
                <ListItem key={achievement.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <TrophyIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={achievement.title}
                    secondary={achievement.description}
                    sx={{
                      opacity: achievement.earned ? 1 : 0.6,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Stats and Activity */}
        <Box sx={{ flex: 1 }}>
          {/* Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {stat.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {typeof stat.value === 'number' && stat.total
                        ? `${stat.value}/${stat.total}`
                        : stat.value
                      }
                    </Typography>
                  </Box>
                  <Typography color="text.secondary" variant="body2">
                    {stat.label}
                  </Typography>
                  {stat.total && (
                    <LinearProgress
                      variant="determinate"
                      value={(stat.value as number / stat.total) * 100}
                      sx={{ mt: 1 }}
                      color={stat.color as any}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Progress Overview */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Learning Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Overall Progress</Typography>
                <Typography variant="body2">
                  {Math.round((user.completedChallenges / user.totalChallenges) * 100)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(user.completedChallenges / user.totalChallenges) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              You've completed {user.completedChallenges} out of {user.totalChallenges} available challenges.
              Keep up the great work!
            </Typography>
          </Paper>

          {/* Recent Activity */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {getActivityText(activity.type)} "{activity.title}"
                          </Typography>
                          <Chip label={activity.category} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={new Date(activity.date).toLocaleDateString()}
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default ProfilePage;
