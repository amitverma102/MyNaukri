import { useState, useEffect } from 'react';
import { 
  Typography, Container, Paper, Box, Button, Avatar, Alert, 
  CircularProgress, Divider, Chip, TextField, IconButton, Tooltip 
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getMediaUrl } from '../api/axios';

export default function AdminProfile() {
  const queryClient = useQueryClient();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    }
  });

  const role = user?.role || user?.Role || 'Administrator';

  // If Institute Administrator, also fetch institution info
  const { data: institution } = useQuery({
    queryKey: ['admin-institution'],
    queryFn: async () => {
      const res = await api.get('/instituteadmin/institution');
      return res.data;
    },
    enabled: role === 'InstituteAdministrator',
    retry: false
  });

  useEffect(() => {
    if (user) {
      const pic = user.profilePictureUrl || user.ProfilePictureUrl || null;
      setProfilePictureUrl(pic);
      if (pic) localStorage.setItem('user_picture', pic);

      const fName = user.firstName || user.FirstName || '';
      const lName = user.lastName || user.LastName || '';
      setEditFirstName(fName);
      setEditLastName(lName);
    }
  }, [user]);

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/auth/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      const newPicUrl = data.profilePictureUrl || data.ProfilePictureUrl;
      setProfilePictureUrl(newPicUrl);
      if (newPicUrl) localStorage.setItem('user_picture', newPicUrl);
      setStatusMsg({ text: 'Profile photo updated successfully!', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to upload photo.';
      setStatusMsg({ text: msg, severity: 'error' });
    }
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/auth/profile-picture');
    },
    onSuccess: () => {
      setProfilePictureUrl(null);
      localStorage.removeItem('user_picture');
      setStatusMsg({ text: 'Profile photo removed.', severity: 'success' });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to remove photo.';
      setStatusMsg({ text: msg, severity: 'error' });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string }) => {
      const res = await api.put('/auth/profile', payload);
      return res.data;
    },
    onSuccess: (data) => {
      const updatedFullName = `${data.firstName || editFirstName} ${data.lastName || editLastName}`.trim();
      if (updatedFullName) {
        localStorage.setItem('user_name', updatedFullName);
      }
      setStatusMsg({ text: 'Name updated successfully!', severity: 'success' });
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to update name.';
      setStatusMsg({ text: msg, severity: 'error' });
    }
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setStatusMsg({ text: 'Image file size must not exceed 5 MB.', severity: 'error' });
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleSaveName = () => {
    if (!editFirstName.trim()) {
      setStatusMsg({ text: 'First name is required.', severity: 'error' });
      return;
    }
    updateProfileMutation.mutate({
      firstName: editFirstName.trim(),
      lastName: editLastName.trim()
    });
  };

  const handleCancelNameEdit = () => {
    setEditFirstName(user?.firstName || user?.FirstName || '');
    setEditLastName(user?.lastName || user?.LastName || '');
    setIsEditingName(false);
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const firstName = user?.firstName || user?.FirstName || '';
  const lastName = user?.lastName || user?.LastName || '';
  const fullName = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : (user?.fullName || user?.FullName || user?.displayName || user?.DisplayName || 'Admin User');
  const email = user?.email || user?.Email || '';

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <AdminPanelSettingsIcon color="primary" fontSize="large" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Administrator Settings
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Manage your personal profile and account credentials.
        </Typography>

        {statusMsg && (
          <Alert severity={statusMsg.severity} sx={{ mb: 3 }} onClose={() => setStatusMsg(null)}>
            {statusMsg.text}
          </Alert>
        )}

        {/* Profile Photo Management */}
        <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, mb: 3, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            src={getMediaUrl(profilePictureUrl)}
            sx={{ width: 84, height: 84, border: '3px solid #cbd5e1', bgcolor: 'primary.main', fontSize: '1.9rem' }}
          >
            {fullName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>
              Profile Photo
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Upload your avatar (JPG, PNG or WebP up to 5 MB).
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                component="label"
                size="small"
                startIcon={uploadPhotoMutation.isPending ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
                disabled={uploadPhotoMutation.isPending}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handlePhotoUpload}
                />
              </Button>
              {profilePictureUrl && (
                <Button
                  variant="text"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  disabled={removePhotoMutation.isPending}
                  onClick={() => removePhotoMutation.mutate()}
                  sx={{ textTransform: 'none' }}
                >
                  Remove
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* Account Details */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 4 }}>
          {/* Name Row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <BadgeIcon color="action" sx={{ mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">Name</Typography>
                {!isEditingName && (
                  <Tooltip title="Edit Name">
                    <IconButton size="small" onClick={() => setIsEditingName(true)}>
                      <EditIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              {isEditingName ? (
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField
                      size="small"
                      label="First Name"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      fullWidth
                      autoFocus
                    />
                    <TextField
                      size="small"
                      label="Last Name"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      fullWidth
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={updateProfileMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                      onClick={handleSaveName}
                      disabled={updateProfileMutation.isPending}
                      sx={{ textTransform: 'none' }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="inherit"
                      startIcon={<CloseIcon />}
                      onClick={handleCancelNameEdit}
                      disabled={updateProfileMutation.isPending}
                      sx={{ textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{fullName}</Typography>
              )}
            </Box>
          </Box>

          {/* Email Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EmailIcon color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary">Email Address</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{email}</Typography>
            </Box>
          </Box>

          {/* Role Row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AdminPanelSettingsIcon color="action" />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Role</Typography>
              <Chip label={role} color="primary" size="small" variant="outlined" sx={{ fontWeight: 600, mt: 0.2 }} />
            </Box>
          </Box>

          {/* Institution Row if applicable */}
          {institution && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2 }}>
              {institution.logoUrl || institution.LogoUrl ? (
                <Avatar
                  src={getMediaUrl(institution.logoUrl || institution.LogoUrl)}
                  variant="rounded"
                  sx={{
                    width: 42,
                    height: 42,
                    bgcolor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    p: 0.4,
                    '& img': { objectFit: 'contain' }
                  }}
                />
              ) : (
                <BusinessIcon color="action" />
              )}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Institution
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {institution.name || institution.Name}
                  {institution.code && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({institution.code})
                    </Typography>
                  )}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="inherit" onClick={() => window.history.back()} sx={{ textTransform: 'none' }}>
            Back
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
