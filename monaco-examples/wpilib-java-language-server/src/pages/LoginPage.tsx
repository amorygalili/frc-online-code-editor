import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
// Simplified icons
const GoogleIcon = () => <span>🔍</span>;
const CodeIcon = () => <span>💻</span>;

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, isAuthenticated, isConfigured } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/challenges');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signIn();
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        {/* Logo/Icon */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ fontSize: 60, mb: 2, textAlign: 'center' }}><CodeIcon /></Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Sign in to continue your FRC programming journey
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Google Sign In Button */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={isLoading || !isConfigured}
          sx={{
            mb: 3,
            py: 1.5,
            bgcolor: '#4285f4',
            '&:hover': {
              bgcolor: '#3367d6',
            },
          }}
        >
          <GoogleIcon /> {isLoading ? 'Signing in...' : !isConfigured ? 'Authentication Not Configured' : 'Continue with Google'}
        </Button>

        <Divider sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        {/* Configuration Info */}
        {!isConfigured && (
          <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" gutterBottom>
              <strong>Authentication Setup Required:</strong> AWS Cognito is not configured.
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              To enable sign in:
            </Typography>
            <Typography variant="body2" component="ol" sx={{ pl: 2, fontSize: '0.875rem' }}>
              <li>Set up AWS Cognito (see AWS_COGNITO_SETUP.md)</li>
              <li>Configure environment variables (see .env.example)</li>
              <li>Restart the application</li>
            </Typography>
          </Alert>
        )}

        {/* Browse as Guest */}
        <Button
          component={Link}
          to="/challenges"
          variant="outlined"
          size="large"
          fullWidth
          sx={{ mb: 3 }}
        >
          Browse Challenges as Guest
        </Button>

        {/* Benefits */}
        <Box sx={{ mt: 4, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            Why create an account?
          </Typography>
          <Box component="ul" sx={{ pl: 2, color: 'text.secondary' }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Save your progress across all challenges
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Track your learning journey and achievements
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Access advanced challenges and features
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Sync your code across devices
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            By signing in, you agree to our{' '}
            <Link to="/terms" style={{ color: 'inherit' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" style={{ color: 'inherit' }}>
              Privacy Policy
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* Additional Info */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          New to FRC programming?{' '}
          <Link to="/" style={{ color: 'inherit', fontWeight: 'bold' }}>
            Learn more about our platform
          </Link>
        </Typography>
      </Box>
    </Container>
  );
};

export default LoginPage;
