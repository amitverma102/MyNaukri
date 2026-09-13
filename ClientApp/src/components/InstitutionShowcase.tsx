import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Box, Typography, Paper, Chip, Button, Card, CardContent,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Avatar
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import api, { getMediaUrl } from '../api/axios';
import { jwtDecode } from 'jwt-decode';

export default function InstitutionShowcase() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Screening question dialog state
  const [screeningJob, setScreeningJob] = useState<any | null>(null);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});

  const { data: showcase, isLoading, isError } = useQuery({
    queryKey: ['institutionShowcase', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/institution/${id}`);
      return res.data;
    },
    enabled: Boolean(id)
  });

  const applyMutation = useMutation({
    mutationFn: async ({ jobId, screeningAnswersJson }: { jobId: string; screeningAnswersJson?: string | null }) => {
      await api.post(`/jobapplications/apply/${jobId}`, { screeningAnswersJson });
    },
    onSuccess: () => {
      alert('Applied successfully!');
      setScreeningJob(null);
      setScreeningAnswers({});
      queryClient.invalidateQueries({ queryKey: ['institutionShowcase', id] });
    },
    onError: (error: any) => {
      const data = error.response?.data;
      const message = typeof data === 'string' && data ? data : (data?.title || data?.message || error.message || 'Failed to apply.');
      alert(message);
    }
  });

  const handleInitiateApply = (job: any) => {
    if (!token) {
      navigate(`/login?returnUrl=/institution/${id}&applyJobId=${job.id}`);
      return;
    }

    let questions: string[] = [];
    if (job.screeningQuestionsJson) {
      try {
        const parsed = JSON.parse(job.screeningQuestionsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          questions = parsed;
        }
      } catch (err) {
        console.error('Failed to parse screening questions:', err);
      }
    }

    if (questions.length > 0) {
      const initialAnswers: Record<string, string> = {};
      questions.forEach((q: string) => {
        initialAnswers[q] = '';
      });
      setScreeningAnswers(initialAnswers);
      setScreeningJob(job);
    } else {
      applyMutation.mutate({ jobId: job.id });
    }
  };

  const handleScreeningSubmit = () => {
    if (!screeningJob) return;
    applyMutation.mutate({
      jobId: screeningJob.id,
      screeningAnswersJson: JSON.stringify(screeningAnswers)
    });
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Loading Institution Profile...</Typography>
      </Container>
    );
  }

  if (isError || !showcase) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Institution profile not found or could not be loaded.
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/jobs')}>
          Back to Jobs
        </Button>
      </Container>
    );
  }

  const activeJobs = showcase.activeJobs || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4, mb: 6 }}>
      {/* Navigation breadcrumb */}
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/jobs')} 
        sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}
      >
        Back to Jobs
      </Button>

      {/* Institution Banner / Header Card */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: { xs: 3, md: 4 }, 
          borderRadius: 3, 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: 'white',
          mb: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ maxWidth: 750 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', mb: 2 }}>
              <Avatar
                src={getMediaUrl(showcase.logoUrl)}
                variant="rounded"
                sx={{
                  width: { xs: 72, sm: 88, md: 96 },
                  height: { xs: 72, sm: 88, md: 96 },
                  bgcolor: '#ffffff',
                  border: '2px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  p: 0.8,
                  flexShrink: 0,
                  '& img': { objectFit: 'contain' }
                }}
              >
                <SchoolIcon sx={{ fontSize: { xs: 40, sm: 48, md: 52 }, color: 'primary.main' }} />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 260 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                    {showcase.name}
                  </Typography>
                  <Chip 
                    icon={<VerifiedIcon sx={{ fill: '#ffffff !important' }} />} 
                    label="Verified Institution" 
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }} 
                  />
                  <Chip 
                    label={showcase.type} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} 
                  />
                </Box>

                <Typography variant="subtitle1" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <LocationOnIcon fontSize="small" />
                  {[showcase.city, showcase.state, showcase.pincode].filter(Boolean).join(', ') || showcase.address || 'India'}
                  {showcase.code && ` • Code: ${showcase.code}`}
                </Typography>
              </Box>
            </Box>

            {showcase.description && (
              <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6, maxWidth: 650 }}>
                {showcase.description}
              </Typography>
            )}
          </Box>

          <Paper 
            elevation={0} 
            sx={{ 
              p: 2.5, 
              borderRadius: 2, 
              bgcolor: 'rgba(255,255,255,0.12)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              minWidth: 240
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Institution Contact
            </Typography>
            {showcase.email && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmailIcon fontSize="small" sx={{ opacity: 0.8 }} /> {showcase.email}
              </Typography>
            )}
            {showcase.phone && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PhoneIcon fontSize="small" sx={{ opacity: 0.8 }} /> {showcase.phone}
              </Typography>
            )}
            {showcase.website && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LanguageIcon fontSize="small" sx={{ opacity: 0.8 }} />
                <a 
                  href={showcase.website.startsWith('http') ? showcase.website : `https://${showcase.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#93c5fd', textDecoration: 'underline' }}
                >
                  Visit Official Website
                </a>
              </Typography>
            )}
          </Paper>
        </Box>
      </Paper>

      {/* Active Vacancies Section */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkIcon color="primary" />
          Active Vacancies at {showcase.name} ({activeJobs.length})
        </Typography>
      </Box>

      {activeJobs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc' }}>
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            There are currently no active job vacancies posted by this institution. Check back soon!
          </Typography>
        </Paper>
      ) : (
        activeJobs.map((job: any) => (
          <Card 
            key={job.id} 
            sx={{ 
              mb: 2.5, 
              borderRadius: 2.5, 
              transition: 'box-shadow 0.2s', 
              '&:hover': { boxShadow: '0 6px 16px rgba(0,0,0,0.08)' } 
            }}
          >
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  src={getMediaUrl(showcase.logoUrl)}
                  variant="rounded"
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    p: 0.5,
                    mt: 0.5,
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    '& img': { objectFit: 'contain' }
                  }}
                >
                  <SchoolIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {job.title}
                    </Typography>
                    {job.isPlatinum && (
                      <Chip size="small" label="Featured" color="secondary" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <LocationOnIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.3 }} />
                  {job.location} | {job.jobType === 'FullTime' ? 'Full Time' : job.jobType}
                  {job.minSalary && job.maxSalary && ` | ₹${(job.minSalary / 100000).toFixed(1)}L - ₹${(job.maxSalary / 100000).toFixed(1)}L PA`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {job.description}
                </Typography>
                {job.requirements && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    <strong>Requirements:</strong> {job.requirements}
                  </Typography>
                )}
              </Box>
            </Box>
              {(!role || isCandidate) && (
                <Button 
                  variant={job.isApplied ? 'outlined' : 'contained'} 
                  onClick={() => handleInitiateApply(job)}
                  disabled={(isCandidate && applyMutation.isPending) || job.isApplied}
                  sx={{ textTransform: 'none', fontWeight: 600, minWidth: 110, mt: { xs: 1, sm: 0 } }}
                >
                  {job.isApplied ? 'Applied' : 'Apply Now'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Screening Questions Dialog */}
      <Dialog 
        open={Boolean(screeningJob)} 
        onClose={() => setScreeningJob(null)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <QuestionAnswerIcon color="primary" />
          Institution Screening Questions
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>{showcase.name}</strong> requires responses to the following questions before submitting your application for <strong>{screeningJob?.title}</strong>:
          </Typography>
          {Object.keys(screeningAnswers).map((question, idx) => (
            <Box key={idx} sx={{ mb: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {idx + 1}. {question}
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="Type your answer..."
                value={screeningAnswers[question] || ''}
                onChange={(e) => setScreeningAnswers(prev => ({
                  ...prev,
                  [question]: e.target.value
                }))}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setScreeningJob(null)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleScreeningSubmit} 
            variant="contained" 
            disabled={applyMutation.isPending}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit & Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
