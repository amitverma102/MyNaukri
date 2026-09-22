import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useMutation } from '@tanstack/react-query';
import api from '../../api/axios';

interface ChangePasswordSectionProps {
  sx?: object;
}

export default function ChangePasswordSection({ sx }: ChangePasswordSectionProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    },
    onSuccess: (data: any) => {
      setSuccessMsg(data?.message || 'Password changed successfully! A security confirmation email has been sent.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      const errResponse = err.response?.data;
      if (typeof errResponse === 'string') {
        setErrorMsg(errResponse);
      } else if (errResponse?.message) {
        setErrorMsg(errResponse.message);
      } else if (errResponse?.title) {
        setErrorMsg(errResponse.title);
      } else {
        setErrorMsg('Failed to change password. Please check your current password and try again.');
      }
      setSuccessMsg('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setErrorMsg('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    changePasswordMutation.mutate();
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: 3,
        borderColor: 'divider',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <LockOutlinedIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Change Password
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ensure your account uses a strong, secure password.
          </Typography>
        </Box>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mt: 2, mb: 1 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ mt: 2, mb: 1 }}
          onClose={() => setSuccessMsg('')}
        >
          {successMsg}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2.5 }}>
        <TextField
          fullWidth
          margin="normal"
          size="small"
          label="Current Password"
          type={showCurrent ? 'text' : 'password'}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle current password visibility"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 0.5 }}>
          <TextField
            fullWidth
            margin="normal"
            size="small"
            label="New Password"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="Minimum 6 characters"
            autoComplete="new-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle new password visibility"
                      onClick={() => setShowNew((prev) => !prev)}
                      edge="end"
                      size="small"
                    >
                      {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />

          <TextField
            fullWidth
            margin="normal"
            size="small"
            label="Confirm New Password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      edge="end"
                      size="small"
                    >
                      {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          {(currentPassword || newPassword || confirmPassword) && (
            <Button
              type="button"
              variant="text"
              color="inherit"
              size="small"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setErrorMsg('');
              }}
              disabled={changePasswordMutation.isPending}
              sx={{ textTransform: 'none' }}
            >
              Clear
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={changePasswordMutation.isPending}
            startIcon={changePasswordMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              borderRadius: 2
            }}
          >
            {changePasswordMutation.isPending ? 'Updating Password...' : 'Update Password'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
