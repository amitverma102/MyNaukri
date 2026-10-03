import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Container, Box, Typography, Paper, Chip, Button,
  CircularProgress, Alert, Avatar, Tooltip
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import SchoolIcon from '@mui/icons-material/School';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import QuizIcon from '@mui/icons-material/Quiz';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import api, { getMediaUrl } from '../api/axios';
import { jwtDecode } from 'jwt-decode';
import { formatRelativeTime } from '../utils/dateUtils';
import ApplyJobDialog from './candidate/ApplyJobDialog';
import JobAiMatchDialog from './candidate/JobAiMatchDialog';
import TailorResumeDialog from './candidate/TailorResumeDialog';

export default function JobDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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

  const [copiedId, setCopiedId] = useState(false);
  const [applyDialogJob, setApplyDialogJob] = useState<any | null>(null);
  const [matchDialogJob, setMatchDialogJob] = useState<any | null>(null);
  const [tailorDialogJob, setTailorDialogJob] = useState<any | null>(null);

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ['job-details', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data;
    },
    enabled: Boolean(id)
  });

  const handleCopyId = () => {
    if (job?.id) {
      navigator.clipboard.writeText(job.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleInitiateApply = (targetJob: any) => {
    if (!token) {
      navigate(`/login?returnUrl=/jobs/${id}&applyJobId=${id}`);
      return;
    }
    setApplyDialogJob(targetJob);
  };

  if (isLoading) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Loading Job Details...</Typography>
      </Container>
    );
  }

  if (isError || !job) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Job opening not found or may have been removed.
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/jobs')}>
          Back to Jobs
        </Button>
      </Container>
    );
  }

  const formatSalary = () => {
    if (job.minSalary && job.maxSalary) {
      if (job.maxSalary >= 100000) {
        return `₹${(job.minSalary / 100000).toFixed(1)}L - ₹${(job.maxSalary / 100000).toFixed(1)}L PA`;
      }
      return `₹${(job.minSalary / 1000).toFixed(0)}K - ₹${(job.maxSalary / 1000).toFixed(0)}K / month`;
    }
    if (job.minSalary) return `From ₹${(job.minSalary / 1000).toFixed(0)}K`;
    if (job.maxSalary) return `Up to ₹${(job.maxSalary / 1000).toFixed(0)}K`;
    return 'Competitive / Not Disclosed';
  };

  const jobTypeDisplay = job.jobType === 'FullTime' ? 'Full Time' : (job.jobType || 'Full Time');

  const hasScreeningQuestions = (() => {
    if (!job.screeningQuestionsJson) return false;
    try {
      const parsed = JSON.parse(job.screeningQuestionsJson);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  })();

  const fromSavedJobs = location.state?.from === 'saved-jobs';

  return (
    <Container maxWidth="lg" sx={{ py: 4, mb: 6 }}>
      {/* Back navigation button */}
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => {
          if (fromSavedJobs) navigate('/candidate/saved-jobs');
          else navigate(-1);
        }} 
        sx={{ mb: 2.5, textTransform: 'none', color: 'text.secondary' }}
      >
        {fromSavedJobs ? 'Back to Saved Jobs' : 'Back to Previous Page'}
      </Button>

      {/* Main Job Banner */}
      <Paper elevation={2} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flex: 1, minWidth: 280 }}>
            <Avatar
              src={getMediaUrl(job.institutionLogoUrl)}
              variant="rounded"
              sx={{
                width: { xs: 60, md: 72 },
                height: { xs: 60, md: 72 },
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                p: 0.8,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                cursor: job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' ? 'pointer' : 'default',
                '& img': { objectFit: 'contain' }
              }}
              onClick={() => {
                if (job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000') {
                  navigate(`/institution/${job.institutionId}`);
                }
              }}
            >
              <SchoolIcon sx={{ color: 'primary.main', fontSize: 36 }} />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.5px' }}>
                  {job.title}
                </Typography>
                {job.isPlatinum && (
                  <Chip size="small" label="⭐ Featured Institution" color="secondary" sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700 }} />
                )}
              </Box>

              <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <BusinessIcon fontSize="small" color="action" />
                {job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' ? (
                  <Tooltip title="View Institution Profile & all vacancies">
                    <span 
                      onClick={() => navigate(`/institution/${job.institutionId}`)}
                      style={{ cursor: 'pointer', color: '#1976d2', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      {job.companyName || 'Verified Institution'}
                    </span>
                  </Tooltip>
                ) : (
                  <span style={{ fontWeight: 600 }}>{job.companyName || 'Verified Institution'}</span>
                )}

                <span>•</span>

                <Tooltip title={copiedId ? "Copied!" : "Click to copy full Job ID"}>
                  <Chip 
                    size="small"
                    label={`Job ID: ${job.id?.substring(0, 8)}`}
                    icon={copiedId ? <CheckCircleIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                    onClick={handleCopyId}
                    variant="outlined"
                    sx={{ cursor: 'pointer', height: 24, fontSize: '0.75rem', fontWeight: 600 }}
                  />
                </Tooltip>

                {job.createdAt && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748b', fontSize: '0.85rem' }}>
                    <AccessTimeIcon sx={{ fontSize: '0.95rem' }} /> Posted {formatRelativeTime(job.createdAt)}
                  </span>
                )}
              </Typography>

              {/* Tags & Badges */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip 
                  label={job.isActive !== false ? 'Active' : 'Closed'} 
                  color={job.isActive !== false ? 'success' : 'default'} 
                  size="small" 
                  sx={{ fontWeight: 700 }}
                />
                <Chip label={jobTypeDisplay} size="small" variant="outlined" />
                {job.workMode && (
                  <Chip size="small" label={job.workMode} variant="outlined" icon={<LaptopMacIcon fontSize="small" />} />
                )}
                {job.boardAffiliation && (
                  <Chip size="small" label={job.boardAffiliation} color="info" variant="outlined" icon={<SchoolIcon fontSize="small" />} />
                )}
                {job.subjectDepartment && (
                  <Chip size="small" label={job.subjectDepartment} sx={{ bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 600 }} />
                )}
              </Box>
            </Box>
          </Box>

          {/* Top Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1.5, minWidth: 160 }}>
            {(!role || isCandidate) && (
              <Button
                variant={job.isApplied ? "outlined" : "contained"}
                color="primary"
                onClick={() => handleInitiateApply(job)}
                disabled={job.isApplied || job.isActive === false}
                size="large"
                sx={{ textTransform: 'none', fontWeight: 700, px: 4, minWidth: 140 }}
              >
                {job.isApplied ? 'Applied' : (job.isActive === false ? 'Position Closed' : 'Apply Now')}
              </Button>
            )}

            {isCandidate && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => setMatchDialogJob(job)}
                  sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                >
                  AI Match
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
      </Paper>

      {/* Highlights Bar */}
      <Paper elevation={0} sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.5 }}>
              SALARY PACKAGE
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#15803d', mt: 0.3 }}>
              {formatSalary()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.5 }}>
              LOCATION
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOnIcon color="action" />
              {job.location || 'Not Specified'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.5 }}>
              JOB TYPE
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.3 }}>
              {jobTypeDisplay}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.5 }}>
              APPLICATION STATUS
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 800, 
                color: job.isApplied ? 'primary.main' : (job.isActive !== false ? '#15803d' : '#64748b'),
                mt: 0.3 
              }}
            >
              {job.isApplied ? '✓ Applied' : (job.isActive !== false ? 'Accepting Applications' : 'Closed')}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Screening Questions Notice */}
      {hasScreeningQuestions && (
        <Alert severity="info" icon={<QuizIcon />} sx={{ borderRadius: 3, mb: 4 }}>
          <strong>Screening Questions Required:</strong> This hiring organization has short screening questions. They will be presented when you click <strong>Apply Now</strong>.
        </Alert>
      )}

      {/* Description Section */}
      <Paper elevation={1} sx={{ p: 4, borderRadius: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
          Job Description
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            whiteSpace: 'pre-line', 
            color: 'text.secondary', 
            lineHeight: 1.85,
            fontSize: '1rem' 
          }}
        >
          {job.description || 'No detailed description provided by the employer.'}
        </Typography>

        {job.requirements && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
              Candidate Requirements & Qualifications
            </Typography>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', color: 'text.primary', lineHeight: 1.8 }}>
                {job.requirements}
              </Typography>
            </Paper>
          </Box>
        )}

        {job.keywords && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.secondary' }}>
              Relevant Department & Keywords
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {job.keywords.split(',').map((kw: string, i: number) => (
                <Chip key={i} label={kw.trim()} sx={{ bgcolor: '#f1f5f9', color: '#334155', fontWeight: 500 }} />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Institution Showcase Info Box */}
      {job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            borderRadius: 3, 
            bgcolor: '#f0f9ff', 
            borderColor: '#bae6fd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Avatar
              src={getMediaUrl(job.institutionLogoUrl)}
              variant="rounded"
              sx={{ width: 50, height: 50, bgcolor: '#ffffff', border: '1px solid #cbd5e1', p: 0.5 }}
            >
              <SchoolIcon color="primary" sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0369a1' }}>
                About {job.companyName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View institution profile, leadership, accreditations, and explore all current job vacancies.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/institution/${job.institutionId}`)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            View Institution Profile
          </Button>
        </Paper>
      )}

      {/* Apply Job Dialog */}
      <ApplyJobDialog
        open={Boolean(applyDialogJob)}
        job={applyDialogJob}
        onClose={() => setApplyDialogJob(null)}
        onAppliedSuccessfully={() => {
          queryClient.invalidateQueries({ queryKey: ['job-details', id] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
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
        onOpenTailor={() => {
          setTailorDialogJob(matchDialogJob);
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
          queryClient.invalidateQueries({ queryKey: ['job-details', id] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
        }}
      />
    </Container>
  );
}
