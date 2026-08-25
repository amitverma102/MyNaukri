import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Link as RouterLink } from 'react-router-dom';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  // Don't show NavBar on auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const token = localStorage.getItem('jwt_token');
  const isAuthenticated = !!token;
  
  let role = '';
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
    } catch (e) {
      console.error("Invalid token", e);
    }
  }

  const isCandidate = role === 'Candidate';
  const isRecruiter = role === 'Recruiter' || role === 'CompanyHR';
  const isSuperAdmin = role === 'SuperAdministrator';
  const isAdmin = role === 'InstituteAdministrator' || role === 'Admin';

  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)', bgcolor: 'white', color: 'text.primary' }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component={RouterLink} 
          to="/" 
          sx={{ fontWeight: 'bold', mr: 4, textDecoration: 'none', color: 'primary.main' }}
        >
          Edu360
        </Typography>
        
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
              <Button color="inherit" onClick={() => navigate('/admin/dashboard')}>Dashboard</Button>
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

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!isAuthenticated && (
            <>
              <Button variant="outlined" color="primary" onClick={() => navigate('/login')} sx={{ borderRadius: 20, px: 3, textTransform: 'none', fontWeight: 600, ml: 2 }}>
                Login
              </Button>
              <Button variant="contained" onClick={() => navigate('/register')} sx={{ ml: 2, borderRadius: 20, px: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#f16521', '&:hover': { bgcolor: '#d95a1c' } }}>
                Register
              </Button>
            </>
          )}
          {isAuthenticated && (
            <Button color="inherit" onClick={handleLogout} variant="outlined" sx={{ ml: 2, borderColor: 'text.primary' }}>
              Logout
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
