import { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, TextField, Button, Alert } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function RecruiterProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
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
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await api.post('/recruiters/profile', { companyName, designation });
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
      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
          Update Recruiter Profile
        </Typography>
        
        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        {updateProfileMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to update profile.</Alert>}

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
