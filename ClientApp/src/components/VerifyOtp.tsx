import { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from query params if available
  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email');
  const [email, setEmail] = useState(emailParam || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      await axios.post('/auth/verify-otp', { email, otp });
      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.response?.data || 'An error occurred during verification.';
      setError(errorMsg);
      if (typeof errorMsg === 'string' && errorMsg.includes('abandoned')) {
        setTimeout(() => {
          navigate('/register');
        }, 3000);
      }
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" gutterBottom align="center">
          Verify Email
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Enter the 6-digit code sent to your email to verify your account.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit}>
          {!emailParam && (
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
          )}
          
          <TextField
            fullWidth
            label="Verification Code (OTP)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            margin="normal"
            required
            slotProps={{ htmlInput: { maxLength: 6 } }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3, mb: 2 }}
          >
            Verify Account
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
