import { Typography, Container, Grid, Card, CardContent, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function InstituteAdminDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [recruiterSummary, setRecruiterSummary] = useState<any>(null);
  
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletRes, summaryRes] = await Promise.all([
        api.get('/instituteadmin/wallet'),
        api.get('/instituteadmin/recruiters/summary')
      ]);
      setWallet(walletRes.data);
      setRecruiterSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const handlePurchase = async () => {
    if (purchaseAmount <= 0) return;
    try {
      await api.post('/instituteadmin/wallet/purchase', { credits: purchaseAmount });
      setIsPurchaseModalOpen(false);
      fetchData();
      alert('Credits purchased successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to purchase credits.');
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
          <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
            <CardContent>
              <Typography variant="h6">Institution Wallet Balance</Typography>
              <Typography variant="h2" sx={{ mt: 2 }}>{wallet?.availableCredits ?? 0}</Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                sx={{ mt: 2 }}
                onClick={() => { setPurchaseAmount(0); setIsPurchaseModalOpen(true); }}
              >
                Purchase Credits
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

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Purchase Credits</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="Number of Credits"
            type="number"
            fullWidth
            variant="outlined"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsPurchaseModalOpen(false)}>Cancel</Button>
          <Button onClick={handlePurchase} variant="contained" color="primary">Confirm Purchase</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
