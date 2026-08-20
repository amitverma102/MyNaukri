import { Typography, Container, Paper, Box, Button } from '@mui/material';

export default function AdminProfile() {
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
          Administrator Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          System-level settings and personal details.
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Admin Control</Typography>
          <Typography variant="body1">Super Admin privileges active.</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button variant="outlined" color="primary">Change Password</Button>
          <Button variant="contained" color="primary">Manage Platform Settings</Button>
        </Box>
      </Paper>
    </Container>
  );
}
