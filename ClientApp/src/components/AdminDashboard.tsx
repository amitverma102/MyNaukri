import { Typography, Container, Paper, Grid, Card, CardContent, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function AdminDashboard() {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  
  useEffect(() => {
    fetchRecruiters();
  }, []);

  const fetchRecruiters = async () => {
    try {
      const response = await api.get('/admin/recruiters');
      setRecruiters(response.data);
    } catch (err) {
      console.error('Failed to fetch recruiters', err);
    }
  };

  const openCreditModal = (recruiter: any) => {
    setSelectedRecruiter(recruiter);
    setCreditAmount(0);
    setIsCreditModalOpen(true);
  };

  const handleIssueCredits = async () => {
    if (!selectedRecruiter || creditAmount === 0) return;
    try {
      await api.post(`/admin/recruiters/${selectedRecruiter.id}/credits`, creditAmount, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setIsCreditModalOpen(false);
      fetchRecruiters();
      alert('Credits successfully adjusted!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust credits.');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        Administrator Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Users</Typography>
              <Typography variant="h3">1,204</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Active Jobs</Typography>
              <Typography variant="h3">432</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Pending Reports</Typography>
              <Typography variant="h3" color="error">5</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h6">System Status</Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          All systems operational. The platform is running smoothly.
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 4, mt: 4, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Recruiter Credit Management</Typography>
        <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Contact Person</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Current Credits</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recruiters.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.companyName || 'N/A'}</TableCell>
                  <TableCell>{r.contactName || `${r.firstName} ${r.lastName}`}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {r.credits}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="outlined" size="small" onClick={() => openCreditModal(r)}>
                      Adjust Credits
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {recruiters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No recruiters found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Credit Modal */}
      <Dialog open={isCreditModalOpen} onClose={() => setIsCreditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Credits for {selectedRecruiter?.companyName || selectedRecruiter?.email}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Current Balance: <strong>{selectedRecruiter?.credits}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Enter a positive number to add credits, or a negative number to deduct credits.
            </Typography>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Amount (+ or -)"
            type="number"
            fullWidth
            variant="outlined"
            value={creditAmount}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCreditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleIssueCredits} variant="contained" color="primary">
            Confirm Adjustment
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}
