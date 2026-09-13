import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Box, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  Avatar, 
  Typography, 
  Divider 
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getMediaUrl } from '../api/axios';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_picture');
    handleMenuClose();
    navigate('/login');
  };

  // Don't show NavBar on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const token = localStorage.getItem('jwt_token');
  const isAuthenticated = !!token;
  
  let role = '';
  let userName = localStorage.getItem('user_name') || '';
  const userPicture = localStorage.getItem('user_picture') || '';

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role || '';
      if (!userName) {
        userName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
          || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']
          || decoded.name
          || decoded.firstName
          || (decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || decoded.email || '').split('@')[0]
          || 'User';
      }
    } catch (e) {
      console.error("Invalid token", e);
    }
  }

  if (!userName) userName = 'User';

  const isCandidate = role === 'Candidate';
  const isRecruiter = role === 'Recruiter' || role === 'CompanyHR';
  const isSuperAdmin = role === 'SuperAdministrator';
  const isAdmin = role === 'InstituteAdministrator' || role === 'Admin';

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'white', color: 'text.primary' }}>
      <Toolbar>
        <Box 
          component={RouterLink} 
          to="/" 
          sx={{ display: 'flex', alignItems: 'center', mr: 4, textDecoration: 'none' }}
        >
          <img 
            src="/logo.jpg" 
            alt="EduKey360" 
            style={{ height: '40px', objectFit: 'contain' }} 
          />
        </Box>
        
        {/* Navigation Links */}
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
          {!isAuthenticated && (
            <>
              <Button color="inherit" onClick={() => navigate('/jobs')} sx={{ textTransform: 'none', fontWeight: 500 }}>Jobs</Button>
              <Button color="inherit" onClick={() => {
                if (location.pathname !== '/') navigate('/#institutions');
                else document.getElementById('institutions')?.scrollIntoView({ behavior: 'smooth' });
              }} sx={{ textTransform: 'none', fontWeight: 500 }}>Institutions</Button>
              <Button color="inherit" onClick={() => {
                if (location.pathname !== '/') navigate('/#services');
                else document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
              }} sx={{ textTransform: 'none', fontWeight: 500 }}>Services</Button>
            </>
          )}
          {isAuthenticated && isCandidate && (
            <>
              <Button color="inherit" onClick={() => navigate('/candidate/dashboard')}>Dashboard</Button>
              <Button color="inherit" onClick={() => navigate('/candidate/profile')}>Profile</Button>
              <Button color="inherit" onClick={() => navigate('/jobs')}>Jobs</Button>
            </>
          )}
          {isAuthenticated && isRecruiter && (
            <>
              <Button color="inherit" onClick={() => navigate('/recruiter/dashboard')}>Dashboard</Button>
              <Button color="inherit" onClick={() => navigate('/recruiter/profile')}>Profile</Button>
            </>
          )}
          {isAuthenticated && isAdmin && (
            <>
              <Button color="inherit" onClick={() => navigate(role === 'InstituteAdministrator' ? '/instituteadmin/dashboard' : '/admin/dashboard')}>Dashboard</Button>
              <Button color="inherit" onClick={() => navigate('/admin/profile')}>Settings</Button>
            </>
          )}
          {isAuthenticated && isSuperAdmin && (
            <>
              <Button color="inherit" onClick={() => navigate('/superadmin/dashboard')}>Dashboard</Button>
              <Button color="inherit" onClick={() => navigate('/superadmin/institutions')}>Institutions</Button>
              <Button color="inherit" onClick={() => navigate('/superadmin/credit-transactions')}>Audit Logs</Button>
            </>
          )}
        </Box>

        {/* Action Buttons & User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!isAuthenticated ? (
            <>
              <Button variant="outlined" color="primary" onClick={() => navigate('/login')} sx={{ borderRadius: 20, px: 3, textTransform: 'none', fontWeight: 600, ml: 2 }}>
                Login
              </Button>
              <Button variant="contained" onClick={() => navigate('/register')} sx={{ ml: 2, borderRadius: 20, px: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#f16521', '&:hover': { bgcolor: '#d95a1c' } }}>
                Register
              </Button>
            </>
          ) : (
            <>
              <Button
                id="user-menu-button"
                aria-controls={isMenuOpen ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isMenuOpen ? 'true' : undefined}
                onClick={handleMenuClick}
                variant="outlined"
                sx={{
                  ml: 2,
                  borderColor: 'rgba(0, 0, 0, 0.15)',
                  color: 'text.primary',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 20,
                  px: 2,
                  py: 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(15, 118, 110, 0.04)'
                  }
                }}
              >
                <Avatar 
                  src={getMediaUrl(userPicture)}
                  sx={{ width: 28, height: 28, fontSize: '0.85rem', bgcolor: 'primary.main', color: 'white', fontWeight: 700 }}
                >
                  {userName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {userName}
                </Typography>
                <KeyboardArrowDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Button>

              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    elevation: 4,
                    sx: {
                      minWidth: 200,
                      borderRadius: 2,
                      mt: 1,
                      overflow: 'visible',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)'
                    }
                  }
                }}
              >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    src={getMediaUrl(userPicture)}
                    sx={{ width: 40, height: 40, fontSize: '1.1rem', bgcolor: 'primary.main' }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {userName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                      {role || 'Authenticated User'}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 0.5 }} />

                {isCandidate && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/candidate/dashboard'); }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                    Dashboard
                  </MenuItem>
                )}

                {isCandidate && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/candidate/profile'); }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    My Profile
                  </MenuItem>
                )}

                {isRecruiter && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/recruiter/profile'); }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Recruiter Profile
                  </MenuItem>
                )}

                {isAdmin && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate('/admin/profile'); }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Settings
                  </MenuItem>
                )}

                <Divider sx={{ my: 0.5 }} />

                <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 600 }}>
                  <ListItemIcon sx={{ color: 'error.main', minWidth: 32 }}>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  LogOut
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
