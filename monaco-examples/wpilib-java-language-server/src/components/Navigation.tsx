import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
// Simplified icons
const MenuIcon = () => <span>☰</span>;
const HomeIcon = () => <span>🏠</span>;
const CodeIcon = () => <span>💻</span>;
const PersonIcon = () => <span>👤</span>;
const LoginIcon = () => <span>🔑</span>;
const LogoutIcon = () => <span>🚪</span>;
const SchoolIcon = () => <span>🎓</span>;

interface NavigationProps {
  isAuthenticated?: boolean;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

const Navigation: React.FC<NavigationProps> = ({ 
  isAuthenticated = false, 
  user 
}) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    // This would handle the actual logout logic
    alert('Logout functionality will be implemented with AWS Cognito');
    handleProfileMenuClose();
  };

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Challenges', path: '/challenges', icon: <SchoolIcon /> },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderDesktopNavigation = () => (
    <>
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        <CodeIcon sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          FRC Challenges
        </Typography>
      </Box>

      {/* Navigation Links */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {navigationItems.map((item) => (
          <Button
            key={item.path}
            component={Link}
            to={item.path}
            color="inherit"
            startIcon={item.icon}
            sx={{
              fontWeight: isActivePath(item.path) ? 'bold' : 'normal',
              bgcolor: isActivePath(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
          >
            {item.label}
          </Button>
        ))}

        {/* Authentication */}
        {isAuthenticated && user ? (
          <>
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ ml: 1 }}
            >
              <Avatar
                sx={{ width: 32, height: 32 }}
                src={user.avatar}
              >
                {user.name.split(' ').map(n => n[0]).join('')}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem component={Link} to="/profile" onClick={handleProfileMenuClose}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button
            component={Link}
            to="/login"
            color="inherit"
            startIcon={<LoginIcon />}
            variant="outlined"
            sx={{ ml: 1 }}
          >
            Sign In
          </Button>
        )}
      </Box>
    </>
  );

  const renderMobileNavigation = () => (
    <>
      {/* Mobile Menu Button */}
      <IconButton
        color="inherit"
        onClick={handleMobileMenuToggle}
        sx={{ mr: 2 }}
      >
        <MenuIcon />
      </IconButton>

      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        <CodeIcon sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
          }}
        >
          FRC Challenges
        </Typography>
      </Box>

      {/* Profile/Login */}
      {isAuthenticated && user ? (
        <IconButton
          onClick={handleProfileMenuOpen}
          color="inherit"
        >
          <Avatar
            sx={{ width: 32, height: 32 }}
            src={user.avatar}
          >
            {user.name.split(' ').map(n => n[0]).join('')}
          </Avatar>
        </IconButton>
      ) : (
        <IconButton
          component={Link}
          to="/login"
          color="inherit"
        >
          <LoginIcon />
        </IconButton>
      )}

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={handleMobileMenuToggle}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <List>
            {navigationItems.map((item) => (
              <ListItem
                key={item.path}
                component={Link}
                to={item.path}
                onClick={handleMobileMenuToggle}
                sx={{
                  color: 'inherit',
                  textDecoration: 'none',
                  bgcolor: isActivePath(item.path) ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Profile Menu (same as desktop) */}
      {isAuthenticated && user && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem component={Link} to="/profile" onClick={handleProfileMenuClose}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      )}
    </>
  );

  return (
    <AppBar position="sticky" sx={{ mb: 0 }}>
      <Toolbar>
        {isMobile ? renderMobileNavigation() : renderDesktopNavigation()}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
