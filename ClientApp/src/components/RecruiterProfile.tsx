import { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, TextField, Button, Alert, Avatar, CircularProgress } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getMediaUrl } from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function RecruiterProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const { data: profile } = useQuery<any>({
    queryKey: ['recruiterProfile'],
    queryFn: async () => {
      const response = await api.get('/recruiters/profile');
      return response.data;
    },
    retry: false
  });

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName || profile.CompanyName || '');
      setDesignation(profile.designation || profile.Designation || '');
      const pic = profile.profilePictureUrl || profile.ProfilePictureUrl || null;
      setProfilePictureUrl(pic);
      if (pic) localStorage.setItem('user_picture', pic);
    }
  }, [profile]);

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/auth/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: (data) => {
      const newPicUrl = data.profilePictureUrl || data.ProfilePictureUrl;
      setProfilePictureUrl(newPicUrl);
      if (newPicUrl) localStorage.setItem('user_picture', newPicUrl);
      setSuccessMsg('Profile photo updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['recruiterProfile'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.response?.data || 'Failed to upload photo.');
    }
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/auth/profile-picture');
    },
    onSuccess: () => {
      setProfilePictureUrl(null);
      localStorage.removeItem('user_picture');
      setSuccessMsg('Profile photo removed.');
      queryClient.invalidateQueries({ queryKey: ['recruiterProfile'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.response?.data || 'Failed to remove photo.');
    }
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must not exceed 5 MB.');
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await api.post('/recruiters/profile', { companyName, designation, profilePictureUrl });
    },
    onSuccess: () => {
      setSuccessMsg('Recruiter profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['recruiterProfile'] });
      setTimeout(() => navigate('/recruiter/dashboard'), 1500);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
          Update Recruiter Profile
        </Typography>
        
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        {updateProfileMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to update profile.</Alert>}

        {/* Profile Photo Section */}
        <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, mb: 3, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar
            src={getMediaUrl(profilePictureUrl)}
            sx={{ width: 80, height: 80, border: '3px solid #cbd5e1', bgcolor: 'primary.main', fontSize: '1.8rem' }}
          >
            {designation?.[0] || 'R'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>
              Profile Photo
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Upload your photo (JPG, PNG or WebP, up to 5 MB).
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Institution Name"
            margin="normal"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Your Designation (e.g. HR Manager)"
            margin="normal"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button type="button" variant="outlined" fullWidth onClick={() => navigate('/recruiter/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" fullWidth disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
