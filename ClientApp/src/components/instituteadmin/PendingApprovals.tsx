import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  Badge,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  Tooltip,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WorkIcon from '@mui/icons-material/Work';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SettingsIcon from '@mui/icons-material/Settings';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import CommentIcon from '@mui/icons-material/Comment';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import api from '../../api/axios';
import { formatDateTime, formatRelativeTime } from '../../utils/dateUtils';
import { JobDetailsDialog, type JobDetailsData } from '../candidate/JobDetailsDialog';

interface JobApprovalItem {
  id: string;
  title: string;
  description: string;
  requirements: string;
  minSalary?: number;
  maxSalary?: number;
  jobType: string;
  location: string;
  keywords?: string;
  recruiterId: string;
  institutionId: string;
  createdAt: string;
  isActive: boolean;
  companyName: string;
  isPlatinum: boolean;
  workMode?: string;
  boardAffiliation?: string;
  subjectDepartment?: string;
  screeningQuestionsJson?: string;
  institutionLogoUrl?: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  approvalComment?: string;
  approvedAt?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterDesignation?: string;
  isRestrictedAccess?: boolean;
  assignedRecruiterIds?: string[];
  assignedRecruiterNames?: string[];
}

export default function PendingApprovals() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<JobApprovalItem[]>([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [requireJobApproval, setRequireJobApproval] = useState<boolean>(true);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionAlert, setActionAlert] = useState<{ text: string; severity: 'success' | 'error' | 'info' } | null>(null);

  // Active recruiters in institution for access management and reassignment
  const [activeRecruiters, setActiveRecruiters] = useState<any[]>([]);

  // Modal states
  const [previewJob, setPreviewJob] = useState<JobDetailsData | null>(null);
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    job: JobApprovalItem | null;
    type: 'approve' | 'reject';
    comment: string;
    isSubmitting: boolean;
  }>({
    open: false,
    job: null,
    type: 'approve',
    comment: '',
    isSubmitting: false
  });

  // Manage Access Modal state
  const [accessModal, setAccessModal] = useState<{
    open: boolean;
    job: JobApprovalItem | null;
    isRestricted: boolean;
    selectedRecruiterIds: string[];
    isSubmitting: boolean;
  }>({
    open: false,
    job: null,
    isRestricted: false,
    selectedRecruiterIds: [],
    isSubmitting: false
  });

  // Reassign Recruiter Modal state
  const [reassignModal, setReassignModal] = useState<{
    open: boolean;
    job: JobApprovalItem | null;
    targetRecruiterId: string;
    isSubmitting: boolean;
  }>({
    open: false,
    job: null,
    targetRecruiterId: '',
    isSubmitting: false
  });

  useEffect(() => {
    fetchSettings();
    fetchJobs();
    fetchActiveRecruiters();
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/instituteadmin/approval-settings');
      setRequireJobApproval(res.data.requireJobApproval ?? true);
    } catch (err) {
      console.error('Failed to load approval settings', err);
    }
  };

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const params: any = {
        status: activeTab
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/instituteadmin/approvals/jobs', { params });
      setJobs(res.data.jobs || []);
      setCounts({
        pending: res.data.pendingCount || 0,
        approved: res.data.approvedCount || 0,
        rejected: res.data.rejectedCount || 0,
        total: res.data.totalCount || 0
      });
    } catch (err: any) {
      console.error('Failed to fetch approval jobs', err);
      setActionAlert({
        text: err.response?.data?.message || err.response?.data || 'Failed to load approval tasks.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleApprovalRequirement = async (newVal: boolean) => {
    try {
      setIsUpdatingSettings(true);
      const res = await api.put('/instituteadmin/approval-settings', {
        requireJobApproval: newVal
      });
      setRequireJobApproval(res.data.requireJobApproval);
      setActionAlert({
        text: newVal
          ? 'Approval flow enabled. New jobs posted by recruiters will require admin review.'
          : 'Approval flow disabled. Recruiter jobs will now be published live automatically.',
        severity: 'success'
      });
    } catch (err: any) {
      setActionAlert({
        text: err.response?.data?.message || err.response?.data || 'Failed to update approval configuration.',
        severity: 'error'
      });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleOpenDecisionModal = (job: JobApprovalItem, type: 'approve' | 'reject') => {
    setDecisionModal({
      open: true,
      job,
      type,
      comment: '',
      isSubmitting: false
    });
  };

  const handleSubmitDecision = async () => {
    if (!decisionModal.job) return;
    try {
      setDecisionModal(prev => ({ ...prev, isSubmitting: true }));
      const jobId = decisionModal.job.id;
      const endpoint = decisionModal.type === 'approve'
        ? `/instituteadmin/approvals/jobs/${jobId}/approve`
        : `/instituteadmin/approvals/jobs/${jobId}/reject`;

      const res = await api.post(endpoint, {
        comment: decisionModal.comment.trim() || null
      });

      setActionAlert({
        text: res.data.message || (decisionModal.type === 'approve' ? 'Job approved successfully.' : 'Job rejected and credits refunded.'),
        severity: 'success'
      });

      setDecisionModal({
        open: false,
        job: null,
        type: 'approve',
        comment: '',
        isSubmitting: false
      });

      fetchJobs();
    } catch (err: any) {
      setActionAlert({
        text: err.response?.data?.message || err.response?.data || 'Failed to submit decision.',
        severity: 'error'
      });
      setDecisionModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const fetchActiveRecruiters = async () => {
    try {
      const res = await api.get('/instituteadmin/recruiters?status=active');
      setActiveRecruiters(res.data || []);
    } catch (err) {
      console.error('Failed to load active recruiters', err);
    }
  };

  const handleOpenAccessModal = (job: JobApprovalItem) => {
    setAccessModal({
      open: true,
      job,
      isRestricted: job.isRestrictedAccess || false,
      selectedRecruiterIds: job.assignedRecruiterIds || [],
      isSubmitting: false
    });
  };

  const handleToggleRecruiterSelection = (recruiterId: string) => {
    setAccessModal(prev => {
      const exists = prev.selectedRecruiterIds.includes(recruiterId);
      const updated = exists
        ? prev.selectedRecruiterIds.filter(id => id !== recruiterId)
        : [...prev.selectedRecruiterIds, recruiterId];
      return { ...prev, selectedRecruiterIds: updated };
    });
  };

  const handleSaveAccess = async () => {
    if (!accessModal.job) return;
    try {
      setAccessModal(prev => ({ ...prev, isSubmitting: true }));
      await api.put(`/instituteadmin/jobs/${accessModal.job.id}/access`, {
        isRestrictedAccess: accessModal.isRestricted,
        assignedRecruiterIds: accessModal.isRestricted ? accessModal.selectedRecruiterIds : []
      });

      setActionAlert({
        text: `Access permissions updated successfully for "${accessModal.job.title}".`,
        severity: 'success'
      });

      setAccessModal({
        open: false,
        job: null,
        isRestricted: false,
        selectedRecruiterIds: [],
        isSubmitting: false
      });

      fetchJobs();
    } catch (err: any) {
      setActionAlert({
        text: err.response?.data?.message || err.response?.data || 'Failed to update job access.',
        severity: 'error'
      });
      setAccessModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleOpenReassignModal = (job: JobApprovalItem) => {
    setReassignModal({
      open: true,
      job,
      targetRecruiterId: '',
      isSubmitting: false
    });
  };

  const handleSaveReassign = async () => {
    if (!reassignModal.job || !reassignModal.targetRecruiterId) return;
    try {
      setReassignModal(prev => ({ ...prev, isSubmitting: true }));
      const res = await api.post(`/instituteadmin/jobs/${reassignModal.job.id}/reassign`, {
        targetRecruiterId: reassignModal.targetRecruiterId
      });

      setActionAlert({
        text: res.data?.message || `Job "${reassignModal.job.title}" successfully reassigned.`,
        severity: 'success'
      });

      setReassignModal({
        open: false,
        job: null,
        targetRecruiterId: '',
        isSubmitting: false
      });

      fetchJobs();
    } catch (err: any) {
      setActionAlert({
        text: err.response?.data?.message || err.response?.data || 'Failed to reassign job.',
        severity: 'error'
      });
      setReassignModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      {/* Title & Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px' }}>
            Job Approvals & Task Workflow
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Review, approve or reject job postings created by recruiters for your institution.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchJobs}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          Refresh Tasks
        </Button>
      </Box>

      {/* Global Action Alert */}
      {actionAlert && (
        <Alert
          severity={actionAlert.severity}
          onClose={() => setActionAlert(null)}
          sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.06)' }}
        >
          {actionAlert.text}
        </Alert>
      )}

      {/* Configurable Approval Flow Card */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 3,
          boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          background: requireJobApproval
            ? 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: requireJobApproval ? '#dcfce7' : '#fee2e2',
                  color: requireJobApproval ? '#166534' : '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SettingsIcon fontSize="medium" />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    Require Admin Approval for Recruiter Jobs
                  </Typography>
                  <Chip
                    label={requireJobApproval ? 'ENABLED (Default)' : 'DISABLED (Direct Publishing)'}
                    color={requireJobApproval ? 'success' : 'default'}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 850 }}>
                  {requireJobApproval
                    ? 'All jobs posted by recruiters in your institution require Institute Admin approval before going live to candidates. Jobs remain pending and candidates cannot apply until approved.'
                    : 'Recruiter jobs bypass review and are immediately published live to candidates. You can re-enable this approval requirement at any time.'}
                </Typography>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={requireJobApproval}
                  disabled={isUpdatingSettings}
                  onChange={(e) => handleToggleApprovalRequirement(e.target.checked)}
                  color="success"
                />
              }
              label={
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                  {requireJobApproval ? 'Approval Required' : 'Approval Bypassed'}
                </Typography>
              }
              sx={{ m: 0 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Summary KPI Metrics */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: activeTab === 'pending' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: activeTab === 'pending' ? '#fffbeb' : '#ffffff',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
            onClick={() => setActiveTab('pending')}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Pending Approvals
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#92400e', mt: 0.5 }}>
                    {counts.pending}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#fef3c7', color: '#d97706', width: 50, height: 50 }}>
                  <HourglassEmptyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: activeTab === 'approved' ? '2px solid #10b981' : '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: activeTab === 'approved' ? '#ecfdf5' : '#ffffff',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
            onClick={() => setActiveTab('approved')}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Approved & Live
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#065f46', mt: 0.5 }}>
                    {counts.approved}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#d1fae5', color: '#059669', width: 50, height: 50 }}>
                  <CheckCircleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: activeTab === 'rejected' ? '2px solid #f43f5e' : '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: activeTab === 'rejected' ? '#fff1f2' : '#ffffff',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
            onClick={() => setActiveTab('rejected')}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#be123c', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Rejected (Refunded)
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#9f1239', mt: 0.5 }}>
                    {counts.rejected}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ffe4e6', color: '#e11d48', width: 50, height: 50 }}>
                  <CancelIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              border: activeTab === 'all' ? '2px solid #6366f1' : '1px solid #e2e8f0',
              cursor: 'pointer',
              bgcolor: activeTab === 'all' ? '#eef2ff' : '#ffffff',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
            onClick={() => setActiveTab('all')}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Postings
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#312e81', mt: 0.5 }}>
                    {counts.total}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#e0e7ff', color: '#4f46e5', width: 50, height: 50 }}>
                  <WorkIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                minHeight: 48
              }
            }}
          >
            <Tab
              value="pending"
              label={
                <Badge badgeContent={counts.pending} color="warning" sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                  Pending Approvals
                </Badge>
              }
            />
            <Tab
              value="approved"
              label={
                <Badge badgeContent={counts.approved} color="success" sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                  Approved
                </Badge>
              }
            />
            <Tab
              value="rejected"
              label={
                <Badge badgeContent={counts.rejected} color="error" sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                  Rejected
                </Badge>
              }
            />
            <Tab
              value="all"
              label={
                <Badge badgeContent={counts.total} color="primary" sx={{ '& .MuiBadge-badge': { right: -12, top: 4 } }}>
                  All History
                </Badge>
              }
            />
          </Tabs>

          <Box sx={{ display: 'flex', gap: 1, minWidth: { xs: '100%', sm: 340 } }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by title, recruiter, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchJobs();
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setSearchQuery(''); fetchJobs(); }}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={fetchJobs}
              sx={{ textTransform: 'none', px: 2.5, borderRadius: 2 }}
            >
              Search
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Main Jobs Listing */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : jobs.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
          <HourglassEmptyIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
            No {activeTab !== 'all' ? activeTab : ''} jobs found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 500, mx: 'auto' }}>
            {activeTab === 'pending'
              ? 'Great news! All recruiter job postings have been reviewed. When recruiters submit new jobs, they will appear here.'
              : 'There are no jobs matching the selected status or search criteria.'}
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {jobs.map((job) => {
            const isPending = job.approvalStatus === 'Pending';
            const isApproved = job.approvalStatus === 'Approved';
            const isRejected = job.approvalStatus === 'Rejected';

            return (
              <Card
                key={job.id}
                sx={{
                  borderRadius: 3,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  border: isPending
                    ? '1.5px solid #f59e0b'
                    : isRejected
                    ? '1px solid #fecdd3'
                    : '1px solid #e2e8f0',
                  overflow: 'hidden'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    {/* Left: Job Details */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          {job.title}
                        </Typography>
                        {job.isPlatinum && (
                          <Chip
                            size="small"
                            label="Platinum"
                            color="secondary"
                            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                          />
                        )}
                        <Chip
                          size="small"
                          label={
                            isPending
                              ? 'Pending Approval'
                              : isApproved
                              ? 'Approved & Live'
                              : 'Rejected'
                          }
                          color={isPending ? 'warning' : isApproved ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                        />
                        {/* Access Policy Chip */}
                        {job.isRestrictedAccess ? (
                          <Tooltip title={`Restricted to ${job.assignedRecruiterNames?.length || 0} assigned recruiter(s) + owner`}>
                            <Chip
                              size="small"
                              icon={<LockIcon sx={{ fontSize: '13px !important' }} />}
                              label={`Restricted (${job.assignedRecruiterNames?.length || 0} Assigned)`}
                              color="warning"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                            />
                          </Tooltip>
                        ) : (
                          <Tooltip title="All recruiters in this institution can view, collaborate, and act on this job by default">
                            <Chip
                              size="small"
                              icon={<PeopleIcon sx={{ fontSize: '13px !important' }} />}
                              label="All Recruiters (Shared)"
                              color="info"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                            />
                          </Tooltip>
                        )}
                      </Box>

                      {/* Recruiter Details Subline */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            Posted by: {job.recruiterName || 'Recruiter'}
                          </Typography>
                        </Box>
                        {job.recruiterDesignation && (
                          <Typography variant="body2" color="text.secondary">
                            • {job.recruiterDesignation}
                          </Typography>
                        )}
                        {job.recruiterEmail && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: '#f1f5f9', px: 1, py: 0.2, borderRadius: 1 }}>
                            {job.recruiterEmail}
                          </Typography>
                        )}
                      </Box>

                      {/* Job Metadata Chips */}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                        <Chip
                          icon={<LocationOnIcon />}
                          label={job.location || 'Location Not Specified'}
                          size="small"
                          variant="outlined"
                          sx={{ bgcolor: '#f8fafc' }}
                        />
                        {(job.minSalary || job.maxSalary) && (
                          <Chip
                            icon={<CurrencyRupeeIcon />}
                            label={`₹${(job.minSalary || 0).toLocaleString()} - ₹${(job.maxSalary || 0).toLocaleString()}`}
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: '#f8fafc' }}
                          />
                        )}
                        {job.workMode && (
                          <Chip
                            label={`Mode: ${job.workMode}`}
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: '#f8fafc' }}
                          />
                        )}
                        {job.boardAffiliation && (
                          <Chip
                            label={`Board: ${job.boardAffiliation}`}
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: '#f8fafc' }}
                          />
                        )}
                        {job.subjectDepartment && (
                          <Chip
                            label={`Dept: ${job.subjectDepartment}`}
                            size="small"
                            variant="outlined"
                            sx={{ bgcolor: '#f8fafc' }}
                          />
                        )}
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={`Posted ${formatRelativeTime(job.createdAt)}`}
                          size="small"
                          variant="outlined"
                          sx={{ bgcolor: '#f8fafc' }}
                        />
                      </Box>

                      {/* Brief description snippet */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5
                        }}
                      >
                        {job.description}
                      </Typography>

                      {/* Admin Decision & Comments note (if already approved or rejected) */}
                      {job.approvalComment && (
                        <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: isRejected ? '#fff1f2' : '#f0fdf4', border: isRejected ? '1px solid #fecdd3' : '1px solid #bbf7d0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: isRejected ? '#9f1239' : '#166534', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CommentIcon sx={{ fontSize: 14 }} /> Admin Feedback / Note:
                          </Typography>
                          <Typography variant="body2" sx={{ color: isRejected ? '#881337' : '#14532d', mt: 0.3 }}>
                            "{job.approvalComment}"
                          </Typography>
                          {job.approvedAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Decision recorded on {formatDateTime(job.approvedAt)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Grid>

                    {/* Right: Actions */}
                    <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="medium"
                        startIcon={<VisibilityIcon />}
                        onClick={() => {
                          setPreviewJob({
                            id: job.id,
                            title: job.title,
                            description: job.description,
                            requirements: job.requirements,
                            minSalary: job.minSalary,
                            maxSalary: job.maxSalary,
                            jobType: job.jobType,
                            location: job.location,
                            companyName: job.companyName,
                            institutionLogoUrl: job.institutionLogoUrl,
                            createdAt: job.createdAt,
                            isActive: job.isActive,
                            isPlatinum: job.isPlatinum,
                            workMode: job.workMode,
                            boardAffiliation: job.boardAffiliation,
                            subjectDepartment: job.subjectDepartment,
                            screeningQuestionsJson: job.screeningQuestionsJson
                          });
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600, width: { xs: '100%', sm: 200 }, borderRadius: 2 }}
                      >
                        View Full Job
                      </Button>

                      {/* Access and Reassignment Management Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 200 } }}>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          startIcon={<SecurityIcon sx={{ fontSize: '15px !important' }} />}
                          onClick={() => handleOpenAccessModal(job)}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: '0.75rem', py: 0.6 }}
                        >
                          Access
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          startIcon={<SwapHorizIcon sx={{ fontSize: '15px !important' }} />}
                          onClick={() => handleOpenReassignModal(job)}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: '0.75rem', py: 0.6 }}
                        >
                          Reassign
                        </Button>
                      </Box>

                      {isPending && (
                        <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 200 } }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="medium"
                            fullWidth
                            startIcon={<ThumbUpIcon />}
                            onClick={() => handleOpenDecisionModal(job, 'approve')}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="medium"
                            fullWidth
                            startIcon={<ThumbDownIcon />}
                            onClick={() => handleOpenDecisionModal(job, 'reject')}
                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                          >
                            Reject
                          </Button>
                        </Box>
                      )}

                      {!isPending && (
                        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Status: <strong>{job.approvalStatus}</strong>
                          </Typography>
                          {job.approvedAt && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Reviewed: {formatRelativeTime(job.approvedAt)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Decision Dialog (Approve / Reject) with Optional Comment Field */}
      <Dialog
        open={decisionModal.open}
        onClose={() => {
          if (!decisionModal.isSubmitting) {
            setDecisionModal(prev => ({ ...prev, open: false }));
          }
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: decisionModal.type === 'approve' ? '#15803d' : '#b91c1c' }}>
          {decisionModal.type === 'approve' ? 'Approve Job Posting' : 'Reject Job Posting'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
            {decisionModal.job?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Recruiter: <strong>{decisionModal.job?.recruiterName}</strong> ({decisionModal.job?.recruiterEmail})
          </Typography>

          {decisionModal.type === 'reject' && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Credit Refund Guarantee:
              </Typography>
              Rejecting this job will automatically refund the posting credits (Normal: 20, Platinum: 40) directly back to the recruiter's credit balance.
            </Alert>
          )}

          {decisionModal.type === 'approve' && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Approving will publish this job immediately, making it live and searchable for qualified candidates.
            </Alert>
          )}

          <TextField
            label="Optional Comment / Reason for Recruiter"
            placeholder={
              decisionModal.type === 'approve'
                ? 'e.g. Approved. Meets institutional criteria.'
                : 'e.g. Please specify the experience requirement and adjust the salary bracket before reposting.'
            }
            multiline
            rows={3}
            fullWidth
            value={decisionModal.comment}
            onChange={(e) => setDecisionModal(prev => ({ ...prev, comment: e.target.value }))}
            disabled={decisionModal.isSubmitting}
            helperText="This comment will be visible to the recruiter in their dashboard."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDecisionModal(prev => ({ ...prev, open: false }))}
            disabled={decisionModal.isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={decisionModal.type === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitDecision}
            disabled={decisionModal.isSubmitting}
            startIcon={decisionModal.isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            {decisionModal.isSubmitting
              ? 'Processing...'
              : decisionModal.type === 'approve'
              ? 'Confirm & Approve'
              : 'Reject & Refund Credits'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Access Dialog: Restrict visibility & actions to selected recruiters or all */}
      <Dialog
        open={accessModal.open}
        onClose={() => {
          if (!accessModal.isSubmitting) {
            setAccessModal(prev => ({ ...prev, open: false }));
          }
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" /> Manage Job Visibility & Permissions
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
            {accessModal.job?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Job Owner: <strong>{accessModal.job?.recruiterName || 'Recruiter'}</strong> ({accessModal.job?.recruiterEmail})
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 2,
              bgcolor: accessModal.isRestricted ? '#fffbeb' : '#f0fdf4',
              borderColor: accessModal.isRestricted ? '#fde68a' : '#bbf7d0'
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={accessModal.isRestricted}
                  onChange={(e) => setAccessModal(prev => ({ ...prev, isRestricted: e.target.checked }))}
                  color="warning"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {accessModal.isRestricted
                      ? 'Restricted Access Enabled'
                      : 'All Institute Recruiters Have Access (Default)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {accessModal.isRestricted
                      ? 'Only explicitly selected recruiters (and the job owner) can view, edit, review candidates, and take action on this job.'
                      : 'Every recruiter in your institution can view responses, schedule interviews, and collaborate on this job.'}
                  </Typography>
                </Box>
              }
            />
          </Paper>

          {accessModal.isRestricted && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>
                Select Recruiters Permitted to Access this Job:
              </Typography>
              {activeRecruiters.length === 0 ? (
                <Alert severity="info">No other active recruiters found in your institution.</Alert>
              ) : (
                <List sx={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 2, p: 0 }}>
                  {activeRecruiters.map((recruiter) => {
                    const isOwner = recruiter.id === accessModal.job?.recruiterId;
                    const isSelected = isOwner || accessModal.selectedRecruiterIds.includes(recruiter.id);

                    return (
                      <ListItem
                        key={recruiter.id}
                        dense
                        divider
                        sx={{ cursor: isOwner ? 'default' : 'pointer' }}
                        onClick={() => {
                          if (!isOwner) handleToggleRecruiterSelection(recruiter.id);
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            edge="start"
                            checked={isSelected}
                            disabled={isOwner}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {recruiter.user?.firstName || recruiter.firstName} {recruiter.user?.lastName || recruiter.lastName}
                              </Typography>
                              {isOwner && (
                                <Chip size="small" label="Owner (Always Has Access)" color="primary" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {recruiter.designation || 'Recruiter'} • {recruiter.user?.email || recruiter.email}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
              <FormHelperText sx={{ mt: 1 }}>
                Checked recruiters will have full visibility to candidate applications, interviews, and notes for this job.
              </FormHelperText>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setAccessModal(prev => ({ ...prev, open: false }))}
            disabled={accessModal.isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAccess}
            disabled={accessModal.isSubmitting}
            startIcon={accessModal.isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            {accessModal.isSubmitting ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reassign Recruiter Dialog */}
      <Dialog
        open={reassignModal.open}
        onClose={() => {
          if (!reassignModal.isSubmitting) {
            setReassignModal(prev => ({ ...prev, open: false }));
          }
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon color="primary" /> Reassign Job Owner
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
            {reassignModal.job?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current Owner: <strong>{reassignModal.job?.recruiterName || 'Recruiter'}</strong> ({reassignModal.job?.recruiterEmail})
          </Typography>

          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            Transferring ownership assigns this job to another recruiter in your institution. The new owner will have primary responsibility for managing applicants and posting updates.
          </Alert>

          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel id="target-recruiter-label">Assign To Active Recruiter</InputLabel>
            <Select
              labelId="target-recruiter-label"
              value={reassignModal.targetRecruiterId}
              label="Assign To Active Recruiter"
              onChange={(e) => setReassignModal(prev => ({ ...prev, targetRecruiterId: e.target.value }))}
              disabled={reassignModal.isSubmitting}
            >
              {activeRecruiters
                .filter(r => r.id !== reassignModal.job?.recruiterId)
                .map((recruiter) => (
                  <MenuItem key={recruiter.id} value={recruiter.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {recruiter.user?.firstName || recruiter.firstName} {recruiter.user?.lastName || recruiter.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {recruiter.designation || 'Recruiter'} • {recruiter.user?.email || recruiter.email}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
            </Select>
            {activeRecruiters.filter(r => r.id !== reassignModal.job?.recruiterId).length === 0 && (
              <FormHelperText error>No other active recruiters available to reassign this job.</FormHelperText>
            )}
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setReassignModal(prev => ({ ...prev, open: false }))}
            disabled={reassignModal.isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveReassign}
            disabled={reassignModal.isSubmitting || !reassignModal.targetRecruiterId}
            startIcon={reassignModal.isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}
          >
            {reassignModal.isSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Job Details Preview Dialog */}
      <JobDetailsDialog
        open={Boolean(previewJob)}
        job={previewJob}
        onClose={() => setPreviewJob(null)}
      />
    </Container>
  );
}
