import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Container, CircularProgress, Box, Button } from '@mui/material';
import api from '../../api/axios';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export default function InterviewInvites() {
  const { data: interviews, isLoading } = useQuery({
    queryKey: ['candidate-interviews'],
    queryFn: async () => {
      const response = await api.get('/jobapplications/candidate/interviews');
      return response.data;
    }
  });

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
        Interview Invites
      </Typography>

      {!interviews || interviews.length === 0 ? (
        <Typography color="text.secondary">You don't have any upcoming interviews right now.</Typography>
      ) : (
        interviews.map((app: any) => (
          <Card key={app.id} sx={{ mb: 2, borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6">Interview for: {app.jobTitle}</Typography>
                <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Date: {app.interviewDate ? new Date(app.interviewDate).toLocaleString() : 'TBD'}
                </Typography>
              </Box>
              {app.interviewLink && (
                <Button variant="contained" href={app.interviewLink} target="_blank">
                  Join Meeting
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}
