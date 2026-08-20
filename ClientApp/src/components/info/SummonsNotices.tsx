import { Container, Typography, Box } from '@mui/material';

export default function SummonsNotices() {
  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8, minHeight: '60vh' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>Summons/Notices</Typography>
        <Typography variant="body1" color="text.secondary">
          This is a placeholder page. Content coming soon!
        </Typography>
      </Box>
    </Container>
  );
}
