import { Typography, Container, Paper, Grid, Card, CardContent, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function InstituteAdminDashboard() {
  const [wallet, setWallet] = useState<any>(null);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);
  const [allocateAmount, setAllocateAmount] = useState<number>(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletRes, recruitersRes] = await Promise.all([
        api.get('/instituteadmin/wallet'),
        api.get('/instituteadmin/recruiters')
      ]);
      setWallet(walletRes.data);
      setRecruiters(recruitersRes.data);
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

  const handleAllocate = async () => {
    if (!selectedRecruiter || allocateAmount <= 0) return;
    try {
      await api.post(`/instituteadmin/recruiters/${selectedRecruiter.id}/allocate`, {
        credits: allocateAmount,
        reason: 'Allocated by Institute Admin'
      });
      setIsAllocateModalOpen(false);
      fetchData();
      alert('Credits allocated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to allocate credits.');
    }
  };

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
      </Grid>
      
      <Paper sx={{ p: 4, mt: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Manage Recruiters</Typography>
          <Button variant="outlined">Add Recruiter</Button>
        </Box>
        <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Current Credits</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recruiters.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.firstName} {r.lastName}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {r.credits}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="contained" 
                      size="small" 
                      onClick={() => { setSelectedRecruiter(r); setAllocateAmount(0); setIsAllocateModalOpen(true); }}
                    >
                      Allocate Credits
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {recruiters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No recruiters found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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

      {/* Allocate Modal */}
      <Dialog open={isAllocateModalOpen} onClose={() => setIsAllocateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Allocate Credits to {selectedRecruiter?.firstName}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Institution Balance: <strong>{wallet?.availableCredits ?? 0}</strong>
            </Typography>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Credits to Allocate"
            type="number"
            fullWidth
            variant="outlined"
            value={allocateAmount}
            onChange={(e) => setAllocateAmount(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsAllocateModalOpen(false)}>Cancel</Button>
          <Button onClick={handleAllocate} variant="contained" color="primary">Allocate</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
