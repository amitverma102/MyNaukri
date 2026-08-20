import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Container, CircularProgress, Box, Chip } from '@mui/material';
import api from '../../api/axios';

export default function ApplicationStatus() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['candidate-applications'],
    queryFn: async () => {
      const response = await api.get('/jobapplications/candidate');
      return response.data;
    }
  });

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  const getStatusColor = (status: string | number) => {
    switch (status) {
      case 'Applied': case 0: return 'info';
      case 'UnderReview': case 1: return 'warning';
      case 'Shortlisted': return 'secondary';
      case 'InterviewScheduled': case 2: return 'primary';
      case 'Offered': case 3: return 'success';
      case 'Hired': return 'success';
      case 'Rejected': case 4: return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string | number) => {
    switch (status) {
      case 'Applied': case 0: return 'Applied';
      case 'UnderReview': case 1: return 'Under Review';
      case 'Shortlisted': return 'Shortlisted';
      case 'InterviewScheduled': case 2: return 'Interview Scheduled';
      case 'Offered': case 3: return 'Offered';
      case 'Hired': return 'Hired';
      case 'Rejected': case 4: return 'Rejected';
      default: return 'Unknown';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Application Status
      </Typography>

      {!applications || applications.length === 0 ? (
        <Typography color="text.secondary">You haven't applied to any jobs yet.</Typography>
      ) : (
        applications.map((app: any) => (
          <Card key={app.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">{app.jobTitle}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Job ID: {app.jobId?.substring(0, 8)}
                </Typography>
                {app.aiFeedback && (
                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                    Feedback: {app.aiFeedback}
                  </Typography>
                )}
                {(app.status === 'InterviewScheduled' || app.status === 2) && app.interviewDate && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.100' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                      📅 Interview Scheduled: {new Date(app.interviewDate).toLocaleString()}
                    </Typography>
                    {app.interviewLink && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        🔗 <a href={app.interviewLink} target="_blank" rel="noreferrer" style={{ color: '#1976d2', textDecoration: 'none' }}>Join Meeting</a>
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              <Chip label={getStatusLabel(app.status)} color={getStatusColor(app.status) as any} />
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}
