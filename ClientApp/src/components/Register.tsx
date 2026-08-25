import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Box, Button, TextField, Typography, Container, Alert, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../api/axios';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState('Candidate');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/register', { firstName, lastName, email, password, role });
      return response.data;
    },
    onSuccess: () => {
      // Direct the user to verify OTP after successful registration
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data || 'Registration failed.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    registerMutation.mutate();
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Link component={RouterLink} to="/" style={{ textDecoration: 'none', color: 'inherit', marginBottom: '16px' }}>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
            Edu360
          </Typography>
        </Link>
        <Typography component="h1" variant="h5">Sign up for Edu360</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
          <TextField
            margin="normal"
            required
            fullWidth
            label="First Name"
            autoFocus
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Email Address"
            type="email"
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
            sx={{ mt: 3, mb: 2 }}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Signing up...' : 'Sign Up'}
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to="/login" variant="body2">
              {"Already have an account? Sign In"}
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
