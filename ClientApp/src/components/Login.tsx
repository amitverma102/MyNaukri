import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Box, Button, TextField, Typography, Container, Alert, Link } from '@mui/material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.message) {
      setSuccessMsg(location.state.message);
      window.history.replaceState({}, document.title)
    }
  }, [location]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('jwt_token', data.token);
      const decoded: any = jwtDecode(data.token);
      const role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
      
      if (role === 'Recruiter' || role === 'CompanyHR') {
        navigate('/recruiter/dashboard');
      } else if (role === 'SuperAdministrator') {
        navigate('/superadmin/dashboard');
      } else if (role === 'InstituteAdministrator') {
        navigate('/instituteadmin/dashboard');
      } else if (role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Sign in to Edu360</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
          {loginMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(loginMutation.error as any)?.response?.data || 'Login failed. Please check credentials.'}
              {((loginMutation.error as any)?.response?.status === 403) && (
                <Box sx={{ mt: 1 }}>
                  <Link component={RouterLink} to={`/verify-otp?email=${encodeURIComponent(email)}`}>
                    Click here to verify your email.
                  </Link>
                </Box>
              )}
            </Alert>
          )}
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot Password?
            </Link>
            <Link component={RouterLink} to="/register" variant="body2">
              {"Don't have an account? Sign Up"}
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
