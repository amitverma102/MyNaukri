import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Grid, Card, CardContent, TextField, Select, MenuItem, InputLabel, FormControl, Chip, IconButton, Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import CreateEditRecruiterDialog from './CreateEditRecruiterDialog';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const RecruiterManagement = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recruiterToEdit, setRecruiterToEdit] = useState<any>(null);

  const [wallet, setWallet] = useState<any>(null);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [recruiterForCredit, setRecruiterForCredit] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditReason, setCreditReason] = useState<string>('Admin Allocation');

  const fetchSummary = async () => {
    try {
      const res = await api.get('/instituteadmin/recruiters/summary');
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await api.get('/instituteadmin/wallet');
      setWallet(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const res = await api.get(`/instituteadmin/recruiters?${params.toString()}`);
      setRecruiters(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchWallet();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRecruiters();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter]);

  const handleDeactivate = async (id: string) => {
    if (!window.confirm("Are you sure you want to deactivate this recruiter?\n\nExisting jobs, applications and credit transaction history will be retained.")) return;
    try {
      await api.delete(`/instituteadmin/recruiters/${id}`);
      fetchSummary();
      fetchRecruiters();
    } catch (err: any) {
      alert(err.response?.data || 'Failed to deactivate recruiter');
    }
  };

  const handleReactivate = async (id: string) => {
    if (!window.confirm("Are you sure you want to reactivate this recruiter?")) return;
    try {
      await api.post(`/instituteadmin/recruiters/${id}/reactivate`);
      fetchSummary();
      fetchRecruiters();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to reactivate recruiter');
    }
  };

  const openCreateDialog = () => {
    setRecruiterToEdit(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (recruiter: any) => {
    setRecruiterToEdit(recruiter);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchSummary();
    fetchRecruiters();
  };

  const openCreditDialog = (recruiter: any) => {
    setRecruiterForCredit(recruiter);
    setCreditAmount(0);
    setCreditReason('Admin Allocation');
    setIsCreditDialogOpen(true);
  };

  const handleAllocateCredits = async () => {
    if (!recruiterForCredit || creditAmount <= 0) return;
    if (wallet && creditAmount > wallet.availableCredits) {
      alert(`Cannot allocate ${creditAmount} credits. Only ${wallet.availableCredits} credits available in Institute Wallet.`);
      return;
    }
    
    try {
      await api.post(`/instituteadmin/recruiters/${recruiterForCredit.id}/allocate`, {
        credits: creditAmount,
        reason: creditReason
      });
      setIsCreditDialogOpen(false);
      fetchRecruiters();
      fetchWallet();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to allocate credits');
    }
  };

  const handleRevokeCredits = async () => {
    if (!recruiterForCredit || creditAmount <= 0) return;
    if (creditAmount > recruiterForCredit.credits) {
      alert(`Cannot revoke ${creditAmount} credits. Recruiter only has ${recruiterForCredit.credits} credits.`);
      return;
    }
    
    try {
      await api.post(`/instituteadmin/recruiters/${recruiterForCredit.id}/revoke`, {
        credits: creditAmount,
        reason: creditReason
      });
      setIsCreditDialogOpen(false);
      fetchRecruiters();
      fetchWallet();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to revoke credits');
    }
  };

  const isLimitReached = summary && !summary.canCreateRecruiter;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Recruiter Management</Typography>
        <Button variant="outlined" onClick={() => navigate('/instituteadmin/dashboard')}>Back to Dashboard</Button>
      </Box>

      {summary && (
        <Card sx={{ mb: 4, borderLeft: isLimitReached ? '4px solid #f44336' : '4px solid #4caf50' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h6">Active Recruiters: {summary.currentRecruiters} / {summary.maxRecruiters}</Typography>
                <Typography color="textSecondary">Available Slots: {summary.availableSlots}</Typography>
                {isLimitReached && (
                  <Typography color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                    ⚠ Maximum recruiter limit reached. Contact your administrator to increase the recruiter limit.
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Tooltip title={isLimitReached ? "Maximum recruiter limit reached. Contact your administrator to increase the recruiter limit." : ""}>
                  <span>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={openCreateDialog} 
                      disabled={isLimitReached}
                    >
                      + Create Recruiter
                    </Button>
                  </span>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {wallet && (
        <Card sx={{ mb: 4, bgcolor: '#f8f9fa' }}>
          <CardContent>
            <Typography variant="h6">Institution Wallet Balance: <Typography component="span" variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>{wallet.availableCredits}</Typography> Credits</Typography>
          </CardContent>
        </Card>
      )}

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField 
            label="Search name, email, mobile" 
            variant="outlined" 
            size="small" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            sx={{ flexGrow: 1, minWidth: '200px' }}
          />
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Designation / Dept</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Credits</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recruiters.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    {r.firstName} {r.lastName}
                    <br/>
                    <Typography variant="caption" color="textSecondary">Created: {new Date(r.createdAt).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell>
                    {r.email}
                    {r.mobile && <><br/><Typography variant="caption">{r.mobile}</Typography></>}
                  </TableCell>
                  <TableCell>
                    {r.designation || '-'}
                    {r.department && <><br/><Typography variant="caption" color="textSecondary">{r.department}</Typography></>}
                  </TableCell>
                  <TableCell>{r.credits}</TableCell>
                  <TableCell>
                    {r.isActive ? 
                      <Chip label="Active" color="success" size="small" /> : 
                      <Chip label="Inactive" color="default" size="small" />
                    }
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Allocate Credits">
                      <IconButton color="secondary" onClick={() => openCreditDialog(r)} size="small" disabled={!r.isActive}>
                        <AccountBalanceWalletIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton color="primary" onClick={() => openEditDialog(r)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {r.isActive ? (
                      <Tooltip title="Deactivate">
                        <IconButton color="error" onClick={() => handleDeactivate(r.id)} size="small">
                          <BlockIcon />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reactivate">
                        <IconButton color="success" onClick={() => handleReactivate(r.id)} size="small">
                          <CheckCircleIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {recruiters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No recruiters found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CreateEditRecruiterDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSuccess={handleDialogSuccess} 
        recruiterToEdit={recruiterToEdit} 
      />

      <Dialog open={isCreditDialogOpen} onClose={() => setIsCreditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Credits for {recruiterForCredit?.firstName} {recruiterForCredit?.lastName}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Current Recruiter Balance: <strong>{recruiterForCredit?.credits}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Available Institution Credits: <strong style={{ color: wallet?.availableCredits > 0 ? 'green' : 'red' }}>{wallet?.availableCredits}</strong>
            </Typography>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Amount of Credits"
            type="number"
            fullWidth
            variant="outlined"
            value={creditAmount}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
            inputProps={{ min: 1 }}
          />
          <TextField
            margin="dense"
            label="Reason"
            type="text"
            fullWidth
            variant="outlined"
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCreditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRevokeCredits} 
            variant="outlined" 
            color="error"
            disabled={creditAmount <= 0 || creditAmount > recruiterForCredit?.credits}
          >
            Take Back (Revoke)
          </Button>
          <Button 
            onClick={handleAllocateCredits} 
            variant="contained" 
            color="primary"
            disabled={creditAmount <= 0 || (wallet && creditAmount > wallet.availableCredits)}
          >
            Allocate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RecruiterManagement;
