import { Box, Typography, Container, Grid, Paper, Avatar, Button, Card, CardContent, Divider, Chip, CircularProgress, Alert } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

interface CandidateProfile {
  id?: string;
  Id?: string;
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  email?: string;
  Email?: string;
  phoneNumber?: string;
  PhoneNumber?: string;
  resumeUrl?: string;
  ResumeUrl?: string;
  skills?: string;
  Skills?: string;
  summary?: string;
  Summary?: string;
  totalExperienceYears?: number;
  TotalExperienceYears?: number;
}

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  minSalary: number;
  maxSalary: number;
  createdAt: string;
  companyName?: string;
  keywords?: string;
}

interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch Profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<CandidateProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/candidates/profile');
      return response.data;
    },
    retry: false
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await api.post(`/jobapplications/apply/${jobId}`);
    },
    onSuccess: () => {
      alert('Applied successfully!');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: any) => {
      const data = err.response?.data;
      const message = typeof data === 'string' && data ? data : (data?.title || data?.message || err.message || 'Failed to apply.');
      alert(message);
    }
  });

  // Fetch Applications
  const { data: applications } = useQuery<JobApplication[]>({
    queryKey: ['applications'],
    queryFn: async () => {
      const response = await api.get('/jobapplications/candidate');
      return response.data;
    },
    enabled: !!profile
  });

  // Fetch Recommended Jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ['recommendedJobs'],
    queryFn: async () => {
      const response = await api.get('/jobs/recommendations');
      return response.data;
    },
    enabled: !!profile // Only fetch if profile exists
  });

  if (profileLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Calculate profile completeness
  const calculateCompleteness = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.firstName || profile.FirstName,
      profile.lastName || profile.LastName,
      profile.phoneNumber || profile.PhoneNumber,
      profile.resumeUrl || profile.ResumeUrl,
      profile.skills || profile.Skills,
      profile.summary || profile.Summary,
      (profile.totalExperienceYears !== undefined && profile.totalExperienceYears !== null) || (profile.TotalExperienceYears !== undefined && profile.TotalExperienceYears !== null)
    ];
    
    const filledFields = fields.filter(field => field !== undefined && field !== null && field !== '');
    return Math.round((filledFields.length / fields.length) * 100);
  };
  const completeness = calculateCompleteness();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        
        {/* Left Column: Profile Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={1} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Avatar sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main', fontSize: '2rem' }}>
              {profile ? (profile.firstName?.[0] || profile.FirstName?.[0] || 'U') : 'U'}
            </Avatar>
            <Typography variant="h6" gutterBottom>
              {profile ? `${profile.firstName || profile.FirstName || ''} ${profile.lastName || profile.LastName || ''}` : 'Guest User'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {profile?.summary || profile?.Summary || 'Add a summary to your profile to attract recruiters.'}
            </Typography>
            
            <Divider sx={{ width: '100%', my: 2 }} />
            
            <Box sx={{ width: '100%', textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Profile Completeness</Typography>
              <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.200', borderRadius: 4, mt: 1, mb: 1 }}>
                <Box sx={{ width: `${completeness}%`, height: '100%', bgcolor: completeness === 100 ? 'success.main' : 'warning.main', borderRadius: 4 }} />
              </Box>
              <Typography variant="caption" color="text.secondary">{completeness}% Complete</Typography>
            </Box>

            <Divider sx={{ width: '100%', my: 2 }} />

            <Button 
            variant="outlined" 
            fullWidth 
            sx={{ mt: 2 }}
            onClick={() => navigate('/candidate/profile')}
          >
            Update Profile
          </Button>
          </Paper>

          {/* Quick Links Card */}
          <Paper sx={{ p: 2, mt: 3, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>Quick Links</Typography>
            <Button size="small" onClick={() => navigate('/candidate/saved-jobs')} sx={{ display: 'block', textAlign: 'left', width: '100%', color: 'text.secondary', textTransform: 'none' }}>Saved Jobs</Button>
            <Button size="small" onClick={() => navigate('/candidate/applications')} sx={{ display: 'block', textAlign: 'left', width: '100%', color: 'text.secondary', textTransform: 'none' }}>Application Status</Button>
            <Button size="small" onClick={() => navigate('/candidate/interviews')} sx={{ display: 'block', textAlign: 'left', width: '100%', color: 'text.secondary', textTransform: 'none' }}>Interview Invites</Button>
          </Paper>
        </Grid>

        {/* Middle Column: Recommended Jobs */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
            Jobs recommended for you
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Based on your profile and search history
          </Typography>

          {profileError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Your Candidate profile is incomplete. Please update your profile to get personalized job recommendations.
            </Alert>
          )}

          {jobsLoading && <CircularProgress />}
          
          {jobs?.map((job) => (
            <Card key={job.id} sx={{ mb: 2, borderRadius: 2, boxShadow: 1, transition: '0.3s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" color="primary.main" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                      {job.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {job.companyName || 'Unknown Institution'} • 4.5 ★ • Job ID: {job.id?.substring(0, 8)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <Chip label="Match" color="success" size="small" variant="outlined" />
                    {(() => {
                      const hasApplied = applications?.some(a => a.jobId === job.id);
                      return (
                        <Button 
                          variant={hasApplied ? "outlined" : "contained"}
                          size="small"
                          color={hasApplied ? "success" : "primary"}
                          onClick={() => applyMutation.mutate(job.id)}
                          disabled={hasApplied || applyMutation.isPending}
                        >
                          {hasApplied ? 'Applied' : 'Apply'}
                        </Button>
                      );
                    })()}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>💼 2-5 Yrs</Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>💰 ₹{job.minSalary/1000}K - ₹{job.maxSalary/1000}K</Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>📍 {job.location}</Box>
                </Box>

                <Typography variant="body2" color="text.primary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {job.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {job.keywords ? (
                    job.keywords.split(',').map((keyword, index) => (
                      <Chip key={index} label={keyword.trim()} size="small" sx={{ bgcolor: 'grey.100' }} />
                    ))
                  ) : (
                    <Chip label="General" size="small" sx={{ bgcolor: 'grey.100' }} />
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}

          {!jobsLoading && jobs?.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography color="text.secondary">No recommendations found yet. Keep updating your skills!</Typography>
            </Paper>
          )}
        </Grid>

        {/* Right Column: Promos & Top Companies */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3, mb: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
              Boost your visibility!
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
              Get 3x more recruiter views with a premium profile.
            </Typography>
            <Button variant="contained" size="small" color="primary">
              Upgrade Now
            </Button>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>Top Institutions hiring</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
              {['Delhi Public School', 'Coursera', 'Khan Academy'].map((company, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'grey.200', color: 'grey.700' }}>
                    {company[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{company}</Typography>
                    <Typography variant="caption" color="text.secondary">Active hiring</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

      </Grid>
    </Container>
  );
}
