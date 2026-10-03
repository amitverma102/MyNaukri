import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Box, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Grid, Card, CardContent, TextField, Select, MenuItem, InputLabel, FormControl, Chip, IconButton, Tooltip,
  Tabs, Tab, TablePagination, CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WorkOutlineIcon from '@mui/icons-material/Work';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import CreateEditRecruiterDialog from './CreateEditRecruiterDialog';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

const RECRUITER_TRANSACTION_TYPES = [
  { value: 'InstitutionToRecruiterAllocation', label: 'Allocation from Institution' },
  { value: 'RecruiterToRecruiterTransfer', label: 'Recruiter Transfer' },
  { value: 'CreditRefund', label: 'Revocation / Refund' },
  { value: 'RecruiterNormalJobPosting', label: 'Normal Job Posting' },
  { value: 'RecruiterPlatinumJobPosting', label: 'Platinum Job Posting' },
  { value: 'RecruiterResumeDownload', label: 'Resume Download' },
  { value: 'RecruiterContactView', label: 'Contact View' },
  { value: 'CreditAdjustment', label: 'Adjustment' },
  { value: 'CreditExpiry', label: 'Expiry' }
];

const RecruiterManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Recruiter directory state
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

  // Recruiter Credit Audit Logs state
  const [auditTransactions, setAuditTransactions] = useState<any[]>([]);
  const [auditTotalRecords, setAuditTotalRecords] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [auditLoading, setAuditLoading] = useState(false);

  // Filters for Audit Log
  const [auditRecruiterId, setAuditRecruiterId] = useState<string>('');
  const [auditTxnType, setAuditTxnType] = useState<string>('');
  const [tempAuditSearch, setTempAuditSearch] = useState<string>('');

  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);
  const [auditFromDate, setAuditFromDate] = useState(defaultFromDate.toISOString().split('T')[0]);
  const [auditToDate, setAuditToDate] = useState(new Date().toISOString().split('T')[0]);

  const [appliedAuditFilters, setAppliedAuditFilters] = useState({
    recruiterId: '',
    transactionType: '',
    fromDate: defaultFromDate.toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    search: ''
  });

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

  const fetchAuditTransactions = async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', (auditPage + 1).toString());
      params.append('pageSize', auditPageSize.toString());
      if (appliedAuditFilters.recruiterId) params.append('recruiterId', appliedAuditFilters.recruiterId);
      if (appliedAuditFilters.transactionType) params.append('transactionType', appliedAuditFilters.transactionType);
      if (appliedAuditFilters.fromDate) params.append('fromDate', appliedAuditFilters.fromDate);
      if (appliedAuditFilters.toDate) params.append('toDate', appliedAuditFilters.toDate);
      if (appliedAuditFilters.search) params.append('search', appliedAuditFilters.search);

      const res = await api.get(`/instituteadmin/recruiters/credit-transactions?${params.toString()}`);
      setAuditTransactions(res.data?.items || []);
      setAuditTotalRecords(res.data?.totalRecords || 0);
    } catch (err) {
      console.error('Failed to fetch recruiter credit audit transactions', err);
    } finally {
      setAuditLoading(false);
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

  useEffect(() => {
    if (activeTab === 1) {
      fetchAuditTransactions();
    }
  }, [activeTab, auditPage, auditPageSize, appliedAuditFilters]);

  // Reassign Jobs modal state
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignSourceRecruiter, setReassignSourceRecruiter] = useState<any>(null);
  const [reassignTargetRecruiterId, setReassignTargetRecruiterId] = useState('');
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);

  // Deactivate confirmation modal state (with optional reassign)
  const [deactivateModal, setDeactivateModal] = useState<{
    open: boolean;
    recruiter: any;
    reassignToRecruiterId: string;
    isSubmitting: boolean;
  }>({
    open: false,
    recruiter: null,
    reassignToRecruiterId: '',
    isSubmitting: false
  });

  const handleDeactivateClick = (recruiter: any) => {
    if (recruiter.totalJobsCount > 0) {
      setDeactivateModal({
        open: true,
        recruiter,
        reassignToRecruiterId: '',
        isSubmitting: false
      });
    } else {
      if (!window.confirm(`Are you sure you want to deactivate recruiter ${recruiter.firstName} ${recruiter.lastName}?`)) return;
      executeDeactivate(recruiter.id);
    }
  };

  const executeDeactivate = async (id: string, reassignToId?: string) => {
    try {
      const url = reassignToId 
        ? `/instituteadmin/recruiters/${id}?reassignToRecruiterId=${reassignToId}`
        : `/instituteadmin/recruiters/${id}`;
      const res = await api.delete(url);
      alert(res.data?.message || 'Recruiter deactivated successfully.');
      setDeactivateModal({ open: false, recruiter: null, reassignToRecruiterId: '', isSubmitting: false });
      fetchSummary();
      fetchRecruiters();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to deactivate recruiter');
    }
  };

  const openReassignModal = (recruiter: any) => {
    setReassignSourceRecruiter(recruiter);
    setReassignTargetRecruiterId('');
    setIsReassignModalOpen(true);
  };

  const handleExecuteReassign = async () => {
    if (!reassignSourceRecruiter || !reassignTargetRecruiterId) return;
    try {
      setIsReassignSubmitting(true);
      const res = await api.post(`/instituteadmin/recruiters/${reassignSourceRecruiter.id}/reassign-jobs`, {
        targetRecruiterId: reassignTargetRecruiterId
      });
      alert(res.data?.message || 'Jobs successfully reassigned.');
      setIsReassignModalOpen(false);
      setReassignSourceRecruiter(null);
      setReassignTargetRecruiterId('');
      fetchRecruiters();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to reassign jobs');
    } finally {
      setIsReassignSubmitting(false);
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
      if (activeTab === 1) fetchAuditTransactions();
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
      if (activeTab === 1) fetchAuditTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data || 'Failed to revoke credits');
    }
  };

  const handleViewRecruiterAudit = (recruiter: any) => {
    setAuditRecruiterId(recruiter.id);
    setAppliedAuditFilters(prev => ({
      ...prev,
      recruiterId: recruiter.id
    }));
    setAuditPage(0);
    setActiveTab(1);
  };

  const handleApplyAuditFilters = () => {
    setAppliedAuditFilters({
      recruiterId: auditRecruiterId,
      transactionType: auditTxnType,
      fromDate: auditFromDate,
      toDate: auditToDate,
      search: tempAuditSearch
    });
    setAuditPage(0);
  };

  const handleResetAuditFilters = () => {
    setAuditRecruiterId('');
    setAuditTxnType('');
    setTempAuditSearch('');
    setAuditFromDate(defaultFromDate.toISOString().split('T')[0]);
    setAuditToDate(new Date().toISOString().split('T')[0]);
    setAppliedAuditFilters({
      recruiterId: '',
      transactionType: '',
      fromDate: defaultFromDate.toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      search: ''
    });
    setAuditPage(0);
  };

  const getTransactionTypeChip = (type: string) => {
    switch (type) {
      case 'InstitutionToRecruiterAllocation':
        return <Chip label="Allocation In" color="primary" size="small" variant="outlined" />;
      case 'RecruiterToRecruiterTransfer':
        return <Chip label="Recruiter Transfer" color="info" size="small" variant="outlined" />;
      case 'CreditRefund':
        return <Chip label="Revocation / Refund" color="warning" size="small" variant="outlined" />;
      case 'RecruiterNormalJobPosting':
        return <Chip label="Normal Job Posting" color="secondary" size="small" variant="outlined" />;
      case 'RecruiterPlatinumJobPosting':
        return <Chip label="Platinum Job Posting" color="secondary" size="small" />;
      case 'RecruiterResumeDownload':
        return <Chip label="Resume Download" color="success" size="small" variant="outlined" />;
      case 'RecruiterContactView':
        return <Chip label="Contact View" color="info" size="small" variant="outlined" />;
      case 'CreditAdjustment':
        return <Chip label="Adjustment" color="default" size="small" variant="outlined" />;
      default:
        return <Chip label={type} size="small" variant="outlined" />;
    }
  };

  const isLimitReached = summary && !summary.canCreateRecruiter;
  const filteredRecruiterObj = recruiters.find(r => r.id === appliedAuditFilters.recruiterId);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Recruiter Management</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Manage departmental recruiter seats, credit allocations, and monitor recruiter credit audit logs.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate('/instituteadmin/dashboard')}>Back to Dashboard</Button>
      </Box>

      {summary && (
        <Card sx={{ mb: 3, borderLeft: isLimitReached ? '4px solid #f44336' : '4px solid #4caf50' }}>
          <CardContent sx={{ py: 2 }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="h6">Active Recruiters: {summary.currentRecruiters} / {summary.maxRecruiters}</Typography>
                <Typography color="textSecondary">Available Slots: {summary.availableSlots}</Typography>
                {isLimitReached && (
                  <Typography color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                    ⚠ Maximum recruiter limit reached. Contact your administrator to increase the recruiter limit.
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
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
        <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="h6">
              Institution Wallet Balance:{' '}
              <Typography component="span" variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                {wallet.availableCredits}
              </Typography>{' '}
              Credits
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Tabs Navigation */}
      <Tabs 
        value={activeTab} 
        onChange={(_, val) => setActiveTab(val)} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab 
          icon={<PeopleIcon />} 
          iconPosition="start" 
          label={`Recruiters Directory (${recruiters.length})`} 
          sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }} 
        />
        <Tab 
          icon={<ReceiptLongIcon />} 
          iconPosition="start" 
          label="Recruiter Credit Audit Logs" 
          sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }} 
        />
      </Tabs>

      {/* TAB 0: RECRUITERS DIRECTORY */}
      {activeTab === 0 && (
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Posted Jobs</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Credits</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recruiters.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</Typography>
                      <Typography variant="caption" color="textSecondary">Created: {formatDate(r.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.email}</Typography>
                      {r.mobile && <Typography variant="caption" color="textSecondary">{r.mobile}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.designation || '-'}</Typography>
                      {r.department && <Typography variant="caption" color="textSecondary">{r.department}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <WorkOutlineIcon sx={{ fontSize: 16, color: (r.activeJobsCount > 0 ? 'primary.main' : 'text.disabled') }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: (r.activeJobsCount > 0 ? 'primary.main' : 'text.primary') }}>
                            {r.activeJobsCount ?? 0} active
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {r.totalJobsCount ?? 0} total posted
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: r.credits > 0 ? 'primary.main' : 'text.secondary' }}>
                        {r.credits}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.isActive ? 
                        <Chip label="Active" color="success" size="small" /> : 
                        <Chip label="Inactive" color="default" size="small" />
                      }
                    </TableCell>
                    <TableCell align="right">
                      {r.totalJobsCount > 0 && (
                        <Tooltip title={`Reassign ${r.totalJobsCount} posted job(s) to another recruiter`}>
                          <IconButton color="warning" onClick={() => openReassignModal(r)} size="small">
                            <SwapHorizIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Allocate / Revoke Credits">
                        <IconButton color="secondary" onClick={() => openCreditDialog(r)} size="small" disabled={!r.isActive}>
                          <AccountBalanceWalletIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Recruiter Credit Audit Logs">
                        <IconButton color="info" onClick={() => handleViewRecruiterAudit(r)} size="small">
                          <ReceiptLongIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Details">
                        <IconButton color="primary" onClick={() => openEditDialog(r)} size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {r.isActive ? (
                        <Tooltip title="Deactivate">
                          <IconButton color="error" onClick={() => handleDeactivateClick(r)} size="small">
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
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No recruiters found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* TAB 1: RECRUITER CREDIT AUDIT LOGS */}
      {activeTab === 1 && (
        <Box>
          {filteredRecruiterObj && (
            <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongIcon color="primary" />
                <Typography variant="body1">
                  Showing credit audit history for: <strong>{filteredRecruiterObj.firstName} {filteredRecruiterObj.lastName}</strong> ({filteredRecruiterObj.email})
                </Typography>
                <Chip label={`Current Balance: ${filteredRecruiterObj.credits} Credits`} color="primary" size="small" sx={{ ml: 1, fontWeight: 'bold' }} />
              </Box>
              <Button size="small" variant="outlined" onClick={handleResetAuditFilters}>
                View All Recruiters
              </Button>
            </Paper>
          )}

          {/* Audit Filters */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Search (Txn ID, Recruiter, Reason)" 
                  value={tempAuditSearch}
                  onChange={(e) => setTempAuditSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleApplyAuditFilters()}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Recruiter</InputLabel>
                  <Select
                    value={auditRecruiterId}
                    label="Recruiter"
                    onChange={(e) => setAuditRecruiterId(e.target.value)}
                  >
                    <MenuItem value=""><em>All Recruiters</em></MenuItem>
                    {recruiters.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.firstName} {r.lastName} ({r.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Transaction Type</InputLabel>
                  <Select
                    value={auditTxnType}
                    label="Transaction Type"
                    onChange={(e) => setAuditTxnType(e.target.value)}
                  >
                    <MenuItem value=""><em>All Types</em></MenuItem>
                    {RECRUITER_TRANSACTION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="From Date"
                  type="date"
                  value={auditFromDate}
                  onChange={(e) => setAuditFromDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="To Date"
                  type="date"
                  value={auditToDate}
                  onChange={(e) => setAuditToDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 1.5 }} sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={handleApplyAuditFilters} sx={{ flex: 1 }} startIcon={<FilterListIcon />}>
                  Filter
                </Button>
                <Button variant="outlined" onClick={handleResetAuditFilters} startIcon={<RestartAltIcon />}>
                  Reset
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Audit Table */}
          <TableContainer component={Paper}>
            {auditLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress size={36} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Txn ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Recruiter</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Action By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credits</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Recruiter Balance</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reason / Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditTransactions.map((tx) => {
                    const isDebit = tx.balanceAfter < tx.balanceBefore || tx.credits < 0;
                    const amount = Math.abs(Number(tx.credits));
                    return (
                      <TableRow key={tx.transactionId} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {tx.transactionId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDateTime(tx.createdDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {tx.recruiterName || '-'}
                          </Typography>
                          {tx.recruiterEmail && (
                            <Typography variant="caption" color="textSecondary">
                              {tx.recruiterEmail}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {tx.userName || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getTransactionTypeChip(tx.transactionType)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: isDebit ? 'error.main' : 'success.main' 
                            }}
                          >
                            {isDebit ? '-' : '+'}{amount}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 600 }}>
                            {tx.balanceAfter}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {tx.reason || tx.description || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {auditTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <Typography variant="body1">No recruiter credit transactions found.</Typography>
                        <Typography variant="caption" color="textSecondary">
                          Transactions generated when allocating credits, transferring, revoking, or posting jobs will appear here.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <TablePagination
              component="div"
              count={auditTotalRecords}
              page={auditPage}
              onPageChange={(_e, newPage) => setAuditPage(newPage)}
              rowsPerPage={auditPageSize}
              onRowsPerPageChange={(e) => {
                setAuditPageSize(parseInt(e.target.value, 10));
                setAuditPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </TableContainer>
        </Box>
      )}

      {/* Create / Edit Recruiter Dialog */}
      <CreateEditRecruiterDialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSuccess={handleDialogSuccess} 
        recruiterToEdit={recruiterToEdit} 
      />

      {/* Credit Allocation / Revocation Dialog */}
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
            slotProps={{ htmlInput: { min: 1 } }}
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

      {/* MODAL: DEACTIVATE RECRUITER WITH JOB REASSIGNMENT OPTION */}
      <Dialog 
        open={deactivateModal.open} 
        onClose={() => setDeactivateModal(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: 'error.main' }}>
          Deactivate Recruiter
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Are you sure you want to deactivate <strong>{deactivateModal.recruiter?.firstName} {deactivateModal.recruiter?.lastName}</strong> ({deactivateModal.recruiter?.email})?
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This recruiter has <strong>{deactivateModal.recruiter?.totalJobsCount} posted job(s)</strong> ({deactivateModal.recruiter?.activeJobsCount} currently active).
            </Alert>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
              To ensure hiring continuity, you can reassign their jobs to another active recruiter in your institution, or deactivate without reassigning.
            </Typography>

            <FormControl fullWidth size="small" sx={{ mt: 1 }}>
              <InputLabel>Reassign Jobs To</InputLabel>
              <Select
                value={deactivateModal.reassignToRecruiterId}
                label="Reassign Jobs To"
                onChange={(e) => setDeactivateModal(prev => ({ ...prev, reassignToRecruiterId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>-- Do not reassign (keep on this recruiter profile) --</em>
                </MenuItem>
                {recruiters
                  .filter(r => r.id !== deactivateModal.recruiter?.id && r.isActive)
                  .map(r => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.firstName} {r.lastName} ({r.email}) {r.designation ? `• ${r.designation}` : ''}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setDeactivateModal(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => executeDeactivate(deactivateModal.recruiter.id)}
            >
              Deactivate Only
            </Button>
            {deactivateModal.reassignToRecruiterId && (
              <Button
                variant="contained"
                color="warning"
                onClick={() => executeDeactivate(deactivateModal.recruiter.id, deactivateModal.reassignToRecruiterId)}
              >
                Reassign Jobs & Deactivate
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* MODAL: STANDALONE REASSIGN JOBS */}
      <Dialog
        open={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Reassign Jobs
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Reassign all jobs currently posted by <strong>{reassignSourceRecruiter?.firstName} {reassignSourceRecruiter?.lastName}</strong> ({reassignSourceRecruiter?.email}).
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Total jobs to transfer: <strong>{reassignSourceRecruiter?.totalJobsCount}</strong> ({reassignSourceRecruiter?.activeJobsCount} active).
            </Alert>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
              Select an active recruiter in your institution who will take over ownership of these jobs.
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Select Target Recruiter</InputLabel>
              <Select
                value={reassignTargetRecruiterId}
                label="Select Target Recruiter"
                onChange={(e) => setReassignTargetRecruiterId(e.target.value)}
              >
                <MenuItem value="" disabled>
                  Select a recruiter
                </MenuItem>
                {recruiters
                  .filter(r => r.id !== reassignSourceRecruiter?.id && r.isActive)
                  .map(r => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.firstName} {r.lastName} ({r.email}) {r.designation ? `• ${r.designation}` : ''}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsReassignModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!reassignTargetRecruiterId || isReassignSubmitting}
            onClick={handleExecuteReassign}
          >
            {isReassignSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Transfer Jobs'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RecruiterManagement;
