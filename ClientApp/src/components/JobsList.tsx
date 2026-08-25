import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, Typography, Container, CircularProgress, Box, Chip, Button, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Paper, IconButton } from '@mui/material';
import api from '../api/axios';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { jwtDecode } from 'jwt-decode';
import { useLocation, useNavigate } from 'react-router-dom';

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

  // Handle auto-apply from login redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const applyJobId = searchParams.get('applyJobId');
    if (applyJobId && isCandidate && !applyMutation.isPending) {
      applyMutation.mutate(applyJobId);
      // Remove the query param so we don't apply again on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, isCandidate, navigate]);
  const [companyNameFilter, setCompanyNameFilter] = useState(searchState?.companyName || '');
  const [locationFilter, setLocationFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');

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

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await api.post(`/jobapplications/apply/${jobId}`);
    },
    onSuccess: () => {
      alert('Applied successfully!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-jobs'] });
    },
    onError: (error: any) => {
      const data = error.response?.data;
      const message = typeof data === 'string' && data ? data : (data?.title || data?.message || error.message || 'Failed to apply.');
      alert(message);
    }
  });

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
        job.keywords?.toLowerCase().includes(searchLower);
        
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
        
      return matchesSearch && matchesLocation && matchesJobType && matchesSalary && matchesCompany;
    });
  }, [jobs, searchTerm, locationFilter, jobTypeFilter, minSalaryFilter, companyNameFilter]);

  if (isJobsLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      {isRecLoading ? (
        <CircularProgress />
      ) : recommendations && recommendations.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'primary.main' }}>
            <AutoAwesomeIcon sx={{ mr: 1 }} />
            AI Recommended Jobs
          </Typography>
          {recommendations.map((job: any) => (
            <Card key={`rec-${job.id}`} sx={{ mb: 2, borderLeft: 4, borderColor: 'primary.main' }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="div">
                    {job.title} <Chip label="Top Match" color="primary" size="small" sx={{ ml: 1 }} />
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {job.companyName || 'Unknown Institution'} • Job ID: {job.id?.substring(0, 8)}
                  </Typography>
                  <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    {job.location} | {job.jobType === 'FullTime' ? 'Full Time' : job.jobType}
                    {job.minSalary && job.maxSalary && ` | ₹${job.minSalary/1000}K - ₹${job.maxSalary/1000}K`}
                  </Typography>
                  <Typography variant="body2">
                    {job.description}
                  </Typography>
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
                      onClick={() => {
                        if (!token) {
                          navigate(`/login?returnUrl=/jobs&applyJobId=${job.id}`);
                        } else {
                          applyMutation.mutate(job.id);
                        }
                      }}
                      disabled={(isCandidate && applyMutation.isPending) || job.isApplied}
                    >
                      {job.isApplied ? 'Applied' : 'Apply'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SearchIcon sx={{ mr: 1 }} />
          Search & Filter Jobs
        </Typography>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 12 }}>
              <TextField
                fullWidth
                label="Search by keywords (title, description, etc.)"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Institution Name"
                variant="outlined"
                value={companyNameFilter}
                onChange={(e) => setCompanyNameFilter(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Location"
                variant="outlined"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. Bangalore"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Job Type</InputLabel>
                <Select
                  value={jobTypeFilter}
                  label="Job Type"
                  onChange={(e) => setJobTypeFilter(e.target.value)}
                >
                  <MenuItem value="All">All Types</MenuItem>
                  <MenuItem value="Full Time">Full Time</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Minimum Salary (₹)"
                variant="outlined"
                type="number"
                value={minSalaryFilter}
                onChange={(e) => setMinSalaryFilter(e.target.value)}
                placeholder="e.g. 500000"
              />
            </Grid>
          </Grid>
        </Paper>
      </Box>

      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <FilterListIcon sx={{ mr: 1 }} />
        All Available Jobs ({filteredJobs.length})
      </Typography>
      
      {filteredJobs.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
          No jobs match your search criteria.
        </Typography>
      ) : (
        filteredJobs.map((job: any) => (
          <Card key={job.id} sx={{ mb: 2 }}>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h6" component="div">
                  {job.title}
                  {job.isPlatinum && <Chip size="small" label="Platinum" color="secondary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {job.companyName || 'Unknown Institution'} • Job ID: {job.id?.substring(0, 8)}
                </Typography>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                  {job.location} | {job.jobType === 'FullTime' ? 'Full Time' : job.jobType}
                  {job.minSalary && job.maxSalary && ` | ₹${job.minSalary/1000}K - ₹${job.maxSalary/1000}K`}
                </Typography>
                <Typography variant="body2">
                  {job.description}
                </Typography>
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
                    onClick={() => {
                      if (!token) {
                        navigate(`/login?returnUrl=/jobs&applyJobId=${job.id}`);
                      } else {
                        applyMutation.mutate(job.id);
                      }
                    }}
                    disabled={(isCandidate && applyMutation.isPending) || job.isApplied}
                  >
                    {job.isApplied ? 'Applied' : 'Apply'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </Container>
  );
}
