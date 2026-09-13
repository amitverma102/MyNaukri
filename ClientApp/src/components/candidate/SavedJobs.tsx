import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, Typography, Container, CircularProgress, Box, Chip, IconButton, Avatar } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SchoolIcon from '@mui/icons-material/School';
import api, { getMediaUrl } from '../../api/axios';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function SavedJobs() {
  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: async () => {
      const response = await api.get('/savedjobs');
      return response.data;
    }
  });

  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/savedjobs/${jobId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
    onError: (error: any) => {
      alert(error.response?.data || 'Failed to remove saved job.');
    }
  });

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />
        My Saved Jobs
      </Typography>

      {!savedJobs || savedJobs.length === 0 ? (
        <Typography color="text.secondary">You haven't saved any jobs yet.</Typography>
      ) : (
        savedJobs.map((save: any) => (
          <Card key={save.id} sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 0 }}>
                  <Avatar
                    src={getMediaUrl(save.institutionLogoUrl)}
                    variant="rounded"
                    sx={{
                      width: 46,
                      height: 46,
                      bgcolor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      p: 0.5,
                      mt: 0.5,
                      flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      '& img': { objectFit: 'contain' }
                    }}
                  >
                    <SchoolIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h6">{save.jobTitle}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {save.companyName} • Job ID: {save.jobId?.substring(0, 8)}
                    </Typography>
                    <Typography sx={{ mb: 1.5 }} color="text.secondary">
                      {save.jobLocation}
                      {save.minSalary && save.maxSalary && ` | ₹${save.minSalary/1000}K - ₹${save.maxSalary/1000}K`}
                    </Typography>
                    <Chip label={save.isActive ? 'Active' : 'Closed'} color={save.isActive ? 'success' : 'default'} size="small" />
                  </Box>
                </Box>
                <IconButton 
                  color="error" 
                  title="Remove from Saved Jobs" 
                  onClick={() => removeMutation.mutate(save.jobId)}
                  disabled={removeMutation.isPending}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}
