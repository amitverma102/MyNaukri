import { Typography, Container, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';
import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function EduTechDashboard() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [creditsToIssue, setCreditsToIssue] = useState<number>(0);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await api.get('/edutechadmin/institutions');
      setInstitutions(response.data);
    } catch (err) {
      console.error('Failed to fetch institutions', err);
    }
  };

  const openIssueModal = (inst: any) => {
    setSelectedInstitution(inst);
    setCreditsToIssue(0);
    setReason('');
    setIsModalOpen(true);
  };

  const handleIssueCredits = async () => {
    if (!selectedInstitution || creditsToIssue <= 0) return;
    try {
      await api.post(`/edutechadmin/institutions/${selectedInstitution.id}/credits/issue`, {
        credits: creditsToIssue,
        reason: reason
      });
      setIsModalOpen(false);
      fetchInstitutions();
      alert('Credits issued successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to issue credits.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom>
        EduTech Admin Dashboard
      </Typography>
      
      <Paper sx={{ p: 4, mt: 4, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Institutions Management</Typography>
        <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Institution Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Wallet Balance</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {institutions.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.type === 0 ? 'School' : i.type === 1 ? 'University' : 'Coaching'}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {i.walletBalance ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="contained" size="small" onClick={() => openIssueModal(i)}>
                      Issue Credits
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {institutions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No institutions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Issue Credits to {selectedInstitution?.name}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Current Balance: <strong>{selectedInstitution?.walletBalance ?? 0}</strong>
            </Typography>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Credits to Issue"
            type="number"
            fullWidth
            variant="outlined"
            value={creditsToIssue}
            onChange={(e) => setCreditsToIssue(Number(e.target.value))}
          />
          <TextField
            margin="dense"
            label="Reason/Notes"
            type="text"
            fullWidth
            variant="outlined"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
          <Button onClick={handleIssueCredits} variant="contained" color="primary">
            Confirm Issue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
