import React, { useEffect, useState } from 'react';
import { Typography, Grid, Paper, Container, Box, Button } from '@mui/material';
import api from '../../api/axios';
import CreateInstitutionDialog from './CreateInstitutionDialog';

interface DashboardStats {
  totalInstitutions: number;
  activeInstitutions: number;
  totalCreditsIssued: number;
  totalCreditsPurchased: number;
  totalCreditsConsumed: number;
  totalCreditsRemaining: number;
}

const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [openCreate, setOpenCreate] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/superadmin/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Super Administrator Dashboard
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setOpenCreate(true)}>
          Add Institution
        </Button>
      </Box>
      
      {stats && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography color="text.secondary" gutterBottom>Total Institutions</Typography>
              <Typography component="p" variant="h4">{stats.totalInstitutions}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography color="text.secondary" gutterBottom>Active Institutions</Typography>
              <Typography component="p" variant="h4">{stats.activeInstitutions}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography color="text.secondary" gutterBottom>Total Credits Remaining</Typography>
              <Typography component="p" variant="h4">{stats.totalCreditsRemaining}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography color="text.secondary" gutterBottom>Credits Issued (Admin)</Typography>
              <Typography component="p" variant="h4">{stats.totalCreditsIssued}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography color="text.secondary" gutterBottom>Credits Purchased</Typography>
              <Typography component="p" variant="h4">{stats.totalCreditsPurchased}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography color="text.secondary" gutterBottom>Credits Consumed</Typography>
              <Typography component="p" variant="h4">{stats.totalCreditsConsumed}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <CreateInstitutionDialog 
        open={openCreate} 
        onClose={() => { setOpenCreate(false); fetchStats(); }} 
      />
    </Container>
  );
};

export default SuperAdminDashboard;
