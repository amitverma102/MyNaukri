import { useState } from 'react';
import { Box, Typography, Container, Grid, Paper, Avatar, Button, Card, CardContent, Divider, Chip, CircularProgress, Alert } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getMediaUrl } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import SchoolIcon from '@mui/icons-material/School';
import JobAiMatchDialog from './candidate/JobAiMatchDialog';
import TailorResumeDialog from './candidate/TailorResumeDialog';
import ApplyJobDialog from './candidate/ApplyJobDialog';

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
  profilePictureUrl?: string;
  ProfilePictureUrl?: string;
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
  institutionId?: string;
  institutionLogoUrl?: string;
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
  const [matchDialogJob, setMatchDialogJob] = useState<any | null>(null);
  const [tailorDialogJob, setTailorDialogJob] = useState<any | null>(null);
  
  // Fetch Profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<CandidateProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/candidates/profile');
      return response.data;
    },
    retry: false
  });

  const [applyDialogJob, setApplyDialogJob] = useState<any | null>(null);

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

  // Fetch Top Institutions hiring from live job openings
  const { data: topInstitutions, isLoading: topInstitutionsLoading } = useQuery({
    queryKey: ['top-institutions'],
    queryFn: async () => {
      const response = await api.get('/jobs/top-institutions');
      return response.data;
    }
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
            <Avatar
              src={getMediaUrl(profile?.profilePictureUrl || profile?.ProfilePictureUrl)}
              sx={{ width: 100, height: 100, mb: 2, bgcolor: 'primary.main', fontSize: '2rem' }}
            >
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
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
              Hello {profile?.firstName || profile?.FirstName || localStorage.getItem('user_name') || 'User'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Discover education openings tailored to your qualifications and preferences.
            </Typography>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>
            Jobs recommended for you
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Based on your profile and search history
          </Typography>

          {profileError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Your profile is incomplete. Please update your profile to get personalized job recommendations.
            </Alert>
          )}

          {jobsLoading && <CircularProgress />}
          
          {jobs?.map((job) => (
            <Card key={job.id} sx={{ mb: 2, borderRadius: 2, boxShadow: 1, transition: '0.3s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <Avatar
                      src={getMediaUrl(job.institutionLogoUrl)}
                      variant="rounded"
                      sx={{
                        width: 44,
                        height: 44,
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        p: 0.5,
                        mt: 0.3,
                        flexShrink: 0,
                        cursor: job.institutionId ? 'pointer' : 'default',
                        '& img': { objectFit: 'contain' }
                      }}
                      onClick={() => {
                        if (job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000') {
                          navigate(`/institution/${job.institutionId}`);
                        }
                      }}
                    >
                      <SchoolIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="h6" color="primary.main" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => setApplyDialogJob(job)}>
                        {job.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.companyName || 'Unknown Institution'} • 4.5 ★ • Job ID: {job.id?.substring(0, 8)}
                      </Typography>
                    </Box>
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
                          onClick={() => setApplyDialogJob(job)}
                          disabled={hasApplied}
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

                <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<AutoAwesomeIcon />}
                    onClick={() => setMatchDialogJob(job)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.75rem' }}
                  >
                    AI Match
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={<EditNoteIcon />}
                    onClick={() => setTailorDialogJob(job)}
                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.75rem' }}
                  >
                    Tailor Resume ✨
                  </Button>
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

        {/* Right Column: Top Companies */}
        <Grid size={{ xs: 12, md: 3 }}>
          {/* Boost your visibility / Premium profile promo hidden until feature is LIVE */}


          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} gutterBottom>Top Institutions hiring</Typography>
            {topInstitutionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : topInstitutions && topInstitutions.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                {topInstitutions.map((inst: any) => (
                  <Box 
                    key={inst.institutionId} 
                    onClick={() => navigate('/jobs', { state: { companyName: inst.institutionName } })}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5, 
                      cursor: 'pointer',
                      p: 1,
                      borderRadius: 1.5,
                      transition: '0.2s',
                      '&:hover': { bgcolor: '#f0f7ff', transform: 'translateX(2px)' }
                    }}
                  >
                    <Avatar 
                      src={getMediaUrl(inst.logoUrl)}
                      variant="rounded" 
                      sx={{ 
                        width: 42, 
                        height: 42, 
                        bgcolor: '#ffffff', 
                        border: '1px solid #e2e8f0',
                        p: 0.5,
                        flexShrink: 0,
                        '& img': { objectFit: 'contain' }
                      }}
                    >
                      <SchoolIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inst.institutionName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inst.jobCount} {inst.jobCount === 1 ? 'opening' : 'openings'} {inst.city ? `• ${inst.city}` : 'available'}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No active openings found at this time.
              </Typography>
            )}
          </Paper>
        </Grid>

      </Grid>

      {/* AI Match & Gap Analysis Dialog */}
      <JobAiMatchDialog
        open={Boolean(matchDialogJob)}
        jobId={matchDialogJob?.id || null}
        jobTitle={matchDialogJob?.title}
        companyName={matchDialogJob?.companyName}
        onClose={() => setMatchDialogJob(null)}
        onOpenTailor={(id) => {
          const targetJob = matchDialogJob || jobs?.find((j: any) => j.id === id);
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
          queryClient.invalidateQueries({ queryKey: ['applications'] });
          queryClient.invalidateQueries({ queryKey: ['recommendedJobs'] });
        }}
      />

      {/* Apply Job Dialog */}
      <ApplyJobDialog
        open={Boolean(applyDialogJob)}
        job={applyDialogJob}
        onClose={() => setApplyDialogJob(null)}
        onAppliedSuccessfully={() => {
          queryClient.invalidateQueries({ queryKey: ['applications'] });
          queryClient.invalidateQueries({ queryKey: ['recommendedJobs'] });
        }}
      />
    </Container>
  );
}
