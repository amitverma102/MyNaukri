import { Typography, Container, Grid, Card, CardContent, Button, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import RechargeModal from './instituteadmin/RechargeModal';
import CreditTransactionTable from './superadmin/CreditTransactionTable';

export default function InstituteAdminDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [recruiterSummary, setRecruiterSummary] = useState<any>(null);
  
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, summaryRes] = await Promise.all([
        api.get('/instituteadmin/wallet/dashboard'),
        api.get('/instituteadmin/recruiters/summary')
      ]);
      setDashboard(dashboardRes.data);
      setRecruiterSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const isLimitReached = recruiterSummary && !recruiterSummary.canCreateRecruiter;


  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Institute Admin Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText', height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Institution Wallet Balance</Typography>
              <Typography variant="h2" sx={{ mt: 2 }}>{dashboard?.availableCredits ?? 0}</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Typography variant="body2">
                  Total Purchased: {dashboard?.totalPurchasedCredits ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Allocated: {dashboard?.totalAllocatedCredits ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Unused Credits: {dashboard?.unusedCredits ?? 0}
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 3, bgcolor: 'white', color: 'secondary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
                onClick={() => setIsPurchaseModalOpen(true)}
              >
                Recharge Credits
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recruiter Summary</Typography>
              {recruiterSummary ? (
                <Box>
                  <Typography variant="body1">
                    Active Recruiters: <strong>{recruiterSummary.currentRecruiters} / {recruiterSummary.maxRecruiters}</strong>
                  </Typography>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                    Available Slots: <strong>{recruiterSummary.availableSlots}</strong>
                  </Typography>
                  
                  {isLimitReached && (
                    <Typography color="error" variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
                      ⚠ Maximum recruiter limit reached.
                    </Typography>
                  )}

                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => navigate('/instituteadmin/recruiters')}
                  >
                    Manage Recruiters
                  </Button>
                </Box>
              ) : (
                <Typography>Loading summary...</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <CreditTransactionTable 
          apiEndpoint="/instituteadmin/wallet/transactions" 
          hideInstitutionColumn={true} 
        />
      </Box>

      <RechargeModal 
        open={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        onSuccess={() => {
          setIsPurchaseModalOpen(false);
          fetchData();
        }} 
      />
    </Container>
  );
}
