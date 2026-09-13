import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, CardContent, Typography, Container, CircularProgress, Box, 
  Chip, Button, TextField, FormControl, InputLabel, Select, MenuItem, 
  Grid, Paper, IconButton, Tooltip, Avatar
} from '@mui/material';
import api, { getMediaUrl } from '../api/axios';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import SchoolIcon from '@mui/icons-material/School';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { jwtDecode } from 'jwt-decode';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateUtils';
import JobAiMatchDialog from './candidate/JobAiMatchDialog';
import TailorResumeDialog from './candidate/TailorResumeDialog';
import ApplyJobDialog from './candidate/ApplyJobDialog';

function formatTimeAgo(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(date);
}

export default function JobsList() {
  const navigate = useNavigate();
  const token = localStorage.getItem('jwt_token');
  let role = '';
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      role = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || decoded.role;
    } catch (e) {
      console.error(e);
    }
  }
  const isCandidate = role === 'Candidate';

  const location = useLocation();
  const searchState = location.state as { searchTerm?: string; companyName?: string } | null;

  // Filters State
  const [searchTerm, setSearchTerm] = useState(searchState?.searchTerm || '');
  const [companyNameFilter, setCompanyNameFilter] = useState(searchState?.companyName || '');
  const [locationFilter, setLocationFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState('All');
  const [boardFilter, setBoardFilter] = useState('All');
  const [datePostedFilter, setDatePostedFilter] = useState('All');

  // Apply Job Dialog State
  const [applyDialogJob, setApplyDialogJob] = useState<any | null>(null);

  // AI Match & Tailor Dialog States
  const [matchDialogJob, setMatchDialogJob] = useState<any | null>(null);
  const [tailorDialogJob, setTailorDialogJob] = useState<any | null>(null);

  const { data: jobs, isLoading: isJobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/jobs');
      return response.data;
    }
  });

  const { data: recommendations, isLoading: isRecLoading } = useQuery({
    queryKey: ['jobs-recommendations'],
    queryFn: async () => {
      const response = await api.get('/jobs/recommendations');
      return response.data;
    },
    enabled: isCandidate,
    retry: false
  });

  const { data: savedJobsData } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: async () => {
      const response = await api.get('/savedjobs');
      return response.data;
    },
    enabled: isCandidate
  });

  const savedJobIds = useMemo(() => {
    if (!savedJobsData) return new Set();
    return new Set(savedJobsData.map((sj: any) => sj.jobId));
  }, [savedJobsData]);

  const queryClient = useQueryClient();

  // Handle auto-apply from login redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const applyJobId = searchParams.get('applyJobId');
    if (applyJobId && isCandidate && (jobs || recommendations)) {
      const targetJob = jobs?.find((j: any) => j.id === applyJobId) || recommendations?.find((j: any) => j.id === applyJobId);
      if (targetJob) {
        setApplyDialogJob(targetJob);
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.search, isCandidate, jobs, recommendations, navigate]);

  const saveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/savedjobs/${jobId}`);
      return response.data;
    },
    onSuccess: (data) => {
      alert(data.message || data.Message || 'Job saved successfully');
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
    },
    onError: (error: any) => {
      alert(error.response?.data || 'Failed to save job.');
    }
  });

  const handleInitiateApply = (job: any) => {
    if (!token) {
      navigate(`/login?returnUrl=/jobs&applyJobId=${job.id}`);
      return;
    }
    setApplyDialogJob(job);
  };

  // Client-side filtering logic
  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    
    return jobs.filter((job: any) => {
      // Search term filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        job.title?.toLowerCase().includes(searchLower) || 
        job.description?.toLowerCase().includes(searchLower) ||
        job.location?.toLowerCase().includes(searchLower) ||
        job.keywords?.toLowerCase().includes(searchLower) ||
        job.subjectDepartment?.toLowerCase().includes(searchLower);
        
      // Location filter
      const matchesLocation = 
        !locationFilter || 
        job.location?.toLowerCase().includes(locationFilter.toLowerCase());
        
      // Job Type filter
      const typeStr = job.jobType === 'FullTime' ? 'Full Time' : (job.jobType || 'Other');
      const matchesJobType = 
        jobTypeFilter === 'All' || 
        typeStr === jobTypeFilter;
        
      // Min Salary filter
      const salaryNum = parseInt(minSalaryFilter, 10);
      const matchesSalary = 
        !minSalaryFilter || 
        isNaN(salaryNum) || 
        (job.minSalary && job.minSalary >= salaryNum) ||
        (job.maxSalary && job.maxSalary >= salaryNum);
        
      // Institution Name filter
      const matchesCompany = 
        !companyNameFilter || 
        job.companyName?.toLowerCase().includes(companyNameFilter.toLowerCase());

      // Work Mode filter
      const matchesWorkMode =
        workModeFilter === 'All' ||
        (job.workMode && job.workMode.toLowerCase() === workModeFilter.toLowerCase());

      // Board Affiliation filter
      const matchesBoard =
        boardFilter === 'All' ||
        (job.boardAffiliation && job.boardAffiliation.toLowerCase().includes(boardFilter.toLowerCase()));

      // Date Posted filter
      let matchesDate = true;
      if (datePostedFilter !== 'All' && job.createdAt) {
        const jobDate = new Date(job.createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - jobDate) / (1000 * 60 * 60);
        if (datePostedFilter === '24h') matchesDate = diffHours <= 24;
        else if (datePostedFilter === '7d') matchesDate = diffHours <= 24 * 7;
        else if (datePostedFilter === '30d') matchesDate = diffHours <= 24 * 30;
      }
        
      return matchesSearch && matchesLocation && matchesJobType && matchesSalary && matchesCompany && matchesWorkMode && matchesBoard && matchesDate;
    });
  }, [jobs, searchTerm, locationFilter, jobTypeFilter, minSalaryFilter, companyNameFilter, workModeFilter, boardFilter, datePostedFilter]);

  if (isJobsLoading) return <CircularProgress sx={{ display: 'block', margin: '4rem auto' }} />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* AI Recommended Jobs */}
      {isRecLoading ? (
        <CircularProgress />
      ) : recommendations && recommendations.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: 'primary.main' }}>
            <AutoAwesomeIcon sx={{ mr: 1, color: '#f59e0b' }} />
            AI Recommended Jobs for You
          </Typography>
          {recommendations.map((job: any) => (
            <Card key={`rec-${job.id}`} sx={{ mb: 2, borderLeft: 5, borderColor: 'primary.main', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Avatar
                    src={getMediaUrl(job.institutionLogoUrl)}
                    variant="rounded"
                    sx={{
                      width: 50,
                      height: 50,
                      bgcolor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      p: 0.5,
                      mt: 0.5,
                      flexShrink: 0,
                      cursor: job.institutionId ? 'pointer' : 'default',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      '& img': { objectFit: 'contain' }
                    }}
                    onClick={() => {
                      if (job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000') {
                        navigate(`/institution/${job.institutionId}`);
                      }
                    }}
                  >
                    <SchoolIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                        {job.title}
                      </Typography>
                      <Chip label="AI Top Match" color="primary" size="small" sx={{ fontWeight: 600 }} />
                      {job.workMode && <Chip label={job.workMode} size="small" variant="outlined" icon={<LaptopMacIcon fontSize="small" />} />}
                      {job.boardAffiliation && <Chip label={job.boardAffiliation} size="small" color="secondary" variant="outlined" />}
                    </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon fontSize="small" color="action" />
                    {job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' ? (
                      <span 
                        onClick={() => navigate(`/institution/${job.institutionId}`)}
                        style={{ cursor: 'pointer', color: '#1976d2', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        {job.companyName || 'Verified Institution'}
                      </span>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{job.companyName || 'Unknown Institution'}</span>
                    )}
                    • Job ID: {job.id?.substring(0, 8)}
                    {job.createdAt && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                        <AccessTimeIcon sx={{ fontSize: '0.9rem' }} /> {formatTimeAgo(job.createdAt)}
                      </span>
                    )}
                  </Typography>
                  <Typography sx={{ mb: 1 }} color="text.secondary" variant="body2">
                    <LocationOnIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.3 }} />
                    {job.location} | {job.jobType === 'FullTime' ? 'Full Time' : job.jobType}
                    {job.minSalary && job.maxSalary && ` | ₹${(job.minSalary / 100000).toFixed(1)}L - ₹${(job.maxSalary / 100000).toFixed(1)}L PA`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {job.description}
                  </Typography>
                  {isCandidate && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => setMatchDialogJob(job)}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        AI Match Score
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<EditNoteIcon />}
                        onClick={() => setTailorDialogJob(job)}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        Tailor Resume ✨
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
                {(!role || isCandidate) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isCandidate && (
                      <IconButton 
                        color="primary" 
                        onClick={() => saveMutation.mutate(job.id)}
                        disabled={saveMutation.isPending}
                        title={savedJobIds.has(job.id) ? "Unsave Job" : "Save Job"}
                      >
                        {savedJobIds.has(job.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                      </IconButton>
                    )}
                    <Button 
                      variant={job.isApplied ? "outlined" : "contained"} 
                      onClick={() => handleInitiateApply(job)}
                      disabled={job.isApplied}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {job.isApplied ? 'Applied' : 'Apply Now'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Advanced Search & Filter Card */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
          <SearchIcon sx={{ mr: 1, color: 'primary.main' }} />
          Search & Discover Education Roles
        </Typography>
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
          <Grid container spacing={2}>
            {/* Primary Search Bar */}
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="Search by keywords, subject, title, or pedagogy..."
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Institution / School Name"
                variant="outlined"
                value={companyNameFilter}
                onChange={(e) => setCompanyNameFilter(e.target.value)}
                placeholder="e.g. DPS, Pathways, Amity"
              />
            </Grid>

            {/* Faceted Dropdowns */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Location / City"
                variant="outlined"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. Delhi NCR, Bangalore"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Work Mode</InputLabel>
                <Select
                  value={workModeFilter}
                  label="Work Mode"
                  onChange={(e) => setWorkModeFilter(e.target.value)}
                >
                  <MenuItem value="All">All Modes</MenuItem>
                  <MenuItem value="In-Person">In-Person</MenuItem>
                  <MenuItem value="Remote">Remote</MenuItem>
                  <MenuItem value="Hybrid">Hybrid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel>Board Affiliation</InputLabel>
                <Select
                  value={boardFilter}
                  label="Board Affiliation"
                  onChange={(e) => setBoardFilter(e.target.value)}
                >
                  <MenuItem value="All">All Boards</MenuItem>
                  <MenuItem value="CBSE">CBSE</MenuItem>
                  <MenuItem value="ICSE">ICSE / ISC</MenuItem>
                  <MenuItem value="IB">IB (International)</MenuItem>
                  <MenuItem value="Cambridge">Cambridge / IGCSE</MenuItem>
                  <MenuItem value="State Board">State Board</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Date Posted</InputLabel>
                <Select
                  value={datePostedFilter}
                  label="Date Posted"
                  onChange={(e) => setDatePostedFilter(e.target.value)}
                >
                  <MenuItem value="All">Anytime</MenuItem>
                  <MenuItem value="24h">Past 24 Hours</MenuItem>
                  <MenuItem value="7d">Past 7 Days</MenuItem>
                  <MenuItem value="30d">Past 30 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <TextField
                fullWidth
                label="Min Salary (₹ / Annual)"
                variant="outlined"
                type="number"
                value={minSalaryFilter}
                onChange={(e) => setMinSalaryFilter(e.target.value)}
                placeholder="e.g. 600000"
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Results Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
          <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
          Available Openings ({filteredJobs.length})
        </Typography>
        {(searchTerm || companyNameFilter || locationFilter || workModeFilter !== 'All' || boardFilter !== 'All' || datePostedFilter !== 'All' || minSalaryFilter) && (
          <Button 
            size="small" 
            variant="text" 
            onClick={() => {
              setSearchTerm('');
              setCompanyNameFilter('');
              setLocationFilter('');
              setJobTypeFilter('All');
              setMinSalaryFilter('');
              setWorkModeFilter('All');
              setBoardFilter('All');
              setDatePostedFilter('All');
            }}
          >
            Clear All Filters
          </Button>
        )}
      </Box>
      
      {filteredJobs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc' }}>
          <Typography color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
            No jobs match your selected criteria.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Try adjusting your search terms, work mode, or board affiliation filters.
          </Typography>
        </Paper>
      ) : (
        filteredJobs.map((job: any) => (
          <Card 
            key={job.id} 
            sx={{ 
              mb: 2, 
              borderRadius: 2.5, 
              transition: 'box-shadow 0.2s', 
              '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.1)' } 
            }}
          >
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  src={getMediaUrl(job.institutionLogoUrl)}
                  variant="rounded"
                  sx={{
                    width: 50,
                    height: 50,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    p: 0.5,
                    mt: 0.5,
                    flexShrink: 0,
                    cursor: job.institutionId ? 'pointer' : 'default',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    '& img': { objectFit: 'contain' }
                  }}
                  onClick={() => {
                    if (job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000') {
                      navigate(`/institution/${job.institutionId}`);
                    }
                  }}
                >
                  <SchoolIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                      {job.title}
                    </Typography>
                    {job.isPlatinum && (
                      <Chip size="small" label="⭐ Featured Institution" color="secondary" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                    )}
                    {job.workMode && (
                      <Chip size="small" label={job.workMode} variant="outlined" icon={<LaptopMacIcon fontSize="small" />} />
                    )}
                    {job.boardAffiliation && (
                      <Chip size="small" label={job.boardAffiliation} color="info" variant="outlined" icon={<SchoolIcon fontSize="small" />} />
                    )}
                    {job.subjectDepartment && (
                      <Chip size="small" label={job.subjectDepartment} sx={{ bgcolor: '#ede9fe', color: '#6d28d9' }} />
                    )}
                  </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  {job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' ? (
                    <Tooltip title="Click to view Institution Profile & all vacancies">
                      <span 
                        onClick={() => navigate(`/institution/${job.institutionId}`)}
                        style={{ cursor: 'pointer', color: '#1976d2', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        {job.companyName || 'Verified Institution'}
                      </span>
                    </Tooltip>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{job.companyName || 'Unknown Institution'}</span>
                  )}
                  • Job ID: {job.id?.substring(0, 8)}
                  {job.createdAt && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                      <AccessTimeIcon sx={{ fontSize: '0.9rem' }} /> {formatTimeAgo(job.createdAt)}
                    </span>
                  )}
                </Typography>
                <Typography sx={{ mb: 1 }} color="text.secondary" variant="body2">
                  <LocationOnIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.3 }} />
                  {job.location} | {job.jobType === 'FullTime' ? 'Full Time' : job.jobType}
                  {job.minSalary && job.maxSalary && ` | ₹${(job.minSalary / 100000).toFixed(1)}L - ₹${(job.maxSalary / 100000).toFixed(1)}L PA`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {job.description}
                </Typography>
                {isCandidate && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={() => setMatchDialogJob(job)}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      AI Match Score
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<EditNoteIcon />}
                      onClick={() => setTailorDialogJob(job)}
                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      Tailor Resume ✨
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
              {(!role || isCandidate) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isCandidate && (
                    <IconButton 
                      color="primary" 
                      onClick={() => saveMutation.mutate(job.id)}
                      disabled={saveMutation.isPending}
                      title={savedJobIds.has(job.id) ? "Unsave Job" : "Save Job"}
                    >
                      {savedJobIds.has(job.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                    </IconButton>
                  )}
                  <Button 
                    variant={job.isApplied ? "outlined" : "contained"} 
                    onClick={() => handleInitiateApply(job)}
                    disabled={job.isApplied}
                    sx={{ textTransform: 'none', fontWeight: 600, minWidth: 100 }}
                  >
                    {job.isApplied ? 'Applied' : 'Apply Now'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Job Application Dialog (Resume selection/upload, optional cover letter, screening questions) */}
      <ApplyJobDialog
        open={Boolean(applyDialogJob)}
        job={applyDialogJob}
        onClose={() => setApplyDialogJob(null)}
        onAppliedSuccessfully={() => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs-recommendations'] });
          queryClient.invalidateQueries({ queryKey: ['applications'] });
        }}
      />

      {/* AI Match & Gap Analysis Dialog */}
      <JobAiMatchDialog
        open={Boolean(matchDialogJob)}
        jobId={matchDialogJob?.id || null}
        jobTitle={matchDialogJob?.title}
        companyName={matchDialogJob?.companyName}
        onClose={() => setMatchDialogJob(null)}
        onOpenTailor={(id) => {
          const targetJob = matchDialogJob || jobs?.find((j: any) => j.id === id) || recommendations?.find((j: any) => j.id === id);
          setTailorDialogJob(targetJob || { id });
        }}
      />

      {/* AI Resume Tailoring Dialog */}
      <TailorResumeDialog
        open={Boolean(tailorDialogJob)}
        jobId={tailorDialogJob?.id || null}
        jobTitle={tailorDialogJob?.title}
        companyName={tailorDialogJob?.companyName}
        onClose={() => setTailorDialogJob(null)}
        onAppliedSuccessfully={() => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs-recommendations'] });
        }}
      />
    </Container>
  );
}
