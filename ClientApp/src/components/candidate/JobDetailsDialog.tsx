import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Paper,
  Tooltip,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import QuizIcon from '@mui/icons-material/Quiz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../../api/axios';
import { formatRelativeTime } from '../../utils/dateUtils';

export interface JobDetailsData {
  id: string;
  title: string;
  description?: string;
  requirements?: string;
  minSalary?: number;
  maxSalary?: number;
  jobType?: string;
  location?: string;
  keywords?: string;
  companyName?: string;
  institutionId?: string;
  institutionLogoUrl?: string;
  createdAt?: string;
  isActive?: boolean;
  isPlatinum?: boolean;
  isApplied?: boolean;
  workMode?: string;
  boardAffiliation?: string;
  subjectDepartment?: string;
  screeningQuestionsJson?: string;
}

interface JobDetailsDialogProps {
  open: boolean;
  job: JobDetailsData | null;
  onClose: () => void;
  onApply?: (job: JobDetailsData) => void;
  onOpenAiMatch?: (job: JobDetailsData) => void;
  onOpenTailorResume?: (job: JobDetailsData) => void;
  onUnsave?: (jobId: string) => void;
  isUnsaving?: boolean;
}

export const JobDetailsDialog: React.FC<JobDetailsDialogProps> = ({
  open,
  job,
  onClose,
  onApply,
  onOpenAiMatch,
  onOpenTailorResume,
  onUnsave,
  isUnsaving = false
}) => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = React.useState(false);

  if (!job) return null;

  const handleCopyId = () => {
    if (job.id) {
      navigator.clipboard.writeText(job.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const hasScreeningQuestions = (() => {
    if (!job.screeningQuestionsJson) return false;
    try {
      const parsed = JSON.parse(job.screeningQuestionsJson);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  })();

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

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth 
      slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '90vh' } } }}
    >
      {/* Header */}
      <DialogTitle sx={{ m: 0, p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flex: 1, minWidth: 0 }}>
          <Avatar
            src={getMediaUrl(job.institutionLogoUrl)}
            variant="rounded"
            sx={{
              width: 56,
              height: 56,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              p: 0.5,
              mt: 0.5,
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              cursor: job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' ? 'pointer' : 'default',
              '& img': { objectFit: 'contain' }
            }}
            onClick={() => {
              if (job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000') {
                onClose();
                navigate(`/institution/${job.institutionId}`);
              }
            }}
          >
            <SchoolIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>
                {job.title}
              </Typography>
              {job.isPlatinum && (
                <Chip size="small" label="⭐ Featured Institution" color="secondary" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <BusinessIcon fontSize="small" color="action" />
              {job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' ? (
                <Tooltip title="Click to view Institution Profile & all vacancies">
                  <span 
                    onClick={() => {
                      onClose();
                      navigate(`/institution/${job.institutionId}`);
                    }}
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
                  sx={{ cursor: 'pointer', height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                />
              </Tooltip>

              {job.createdAt && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#64748b', fontSize: '0.8rem' }}>
                  <AccessTimeIcon sx={{ fontSize: '0.9rem' }} /> Posted {formatRelativeTime(job.createdAt)}
                </span>
              )}
            </Typography>

            {/* Badges row */}
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              <Chip 
                label={job.isActive !== false ? 'Active' : 'Closed'} 
                color={job.isActive !== false ? 'success' : 'default'} 
                size="small" 
                sx={{ fontWeight: 600, height: 22 }}
              />
              <Chip 
                label={jobTypeDisplay} 
                size="small" 
                variant="outlined" 
                sx={{ height: 22 }}
              />
              {job.workMode && (
                <Chip 
                  size="small" 
                  label={job.workMode} 
                  variant="outlined" 
                  icon={<LaptopMacIcon fontSize="small" />} 
                  sx={{ height: 22 }}
                />
              )}
              {job.boardAffiliation && (
                <Chip 
                  size="small" 
                  label={job.boardAffiliation} 
                  color="info" 
                  variant="outlined" 
                  icon={<SchoolIcon fontSize="small" />} 
                  sx={{ height: 22 }}
                />
              )}
              {job.subjectDepartment && (
                <Chip 
                  size="small" 
                  label={job.subjectDepartment} 
                  sx={{ bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 600, height: 22 }} 
                />
              )}
            </Box>
          </Box>
        </Box>

        <IconButton onClick={onClose} size="small" sx={{ color: 'grey.500' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Quick Highlights Bar */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                SALARY PACKAGE
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d', mt: 0.2 }}>
                {formatSalary()}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                LOCATION
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon fontSize="small" color="action" />
                {job.location || 'Not Specified'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                EMPLOYMENT TYPE
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.2 }}>
                {jobTypeDisplay} {job.workMode ? `• ${job.workMode}` : ''}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                APPLICATION STATUS
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 700, 
                  color: job.isApplied ? 'primary.main' : (job.isActive !== false ? '#15803d' : '#64748b'),
                  mt: 0.2 
                }}
              >
                {job.isApplied ? '✓ Applied' : (job.isActive !== false ? 'Accepting Applications' : 'Closed')}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Screening Questions Notice */}
        {hasScreeningQuestions && (
          <Alert severity="info" icon={<QuizIcon />} sx={{ borderRadius: 2 }}>
            <strong>Screening Questions Required:</strong> This institution has included short screening questions for applicants. You will be prompted to answer them when you click <strong>Apply Now</strong>.
          </Alert>
        )}

        {/* Full Job Description */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
            Job Description
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              whiteSpace: 'pre-line', 
              color: 'text.secondary', 
              lineHeight: 1.8,
              fontSize: '0.925rem' 
            }}
          >
            {job.description || 'No detailed description provided by the employer.'}
          </Typography>
        </Box>

        {/* Candidate Requirements */}
        {job.requirements && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
              Key Candidate Requirements & Qualifications
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  whiteSpace: 'pre-line', 
                  color: 'text.primary', 
                  lineHeight: 1.7 
                }}
              >
                {job.requirements}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Keywords & Tags */}
        {job.keywords && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Relevant Subjects & Keywords
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {job.keywords.split(',').map((kw, i) => (
                <Chip key={i} label={kw.trim()} size="small" sx={{ bgcolor: '#f1f5f9', color: '#334155' }} />
              ))}
            </Box>
          </Box>
        )}

        {/* Institution Showcase Info Box */}
        {job.institutionId && job.institutionId !== '00000000-0000-0000-0000-000000000000' && (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2.5, 
              borderRadius: 2.5, 
              bgcolor: '#f0f9ff', 
              borderColor: '#bae6fd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={getMediaUrl(job.institutionLogoUrl)}
                variant="rounded"
                sx={{ width: 44, height: 44, bgcolor: '#ffffff', border: '1px solid #cbd5e1', p: 0.5 }}
              >
                <SchoolIcon color="primary" />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                  About {job.companyName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Explore full institution profile, accreditation, leadership, and other open positions.
                </Typography>
              </Box>
            </Box>

            <Button
              size="small"
              variant="outlined"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={() => {
                onClose();
                navigate(`/institution/${job.institutionId}`);
              }}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              View Institution Profile
            </Button>
          </Paper>
        )}
      </DialogContent>

      <Divider />

      {/* Action Footer */}
      <DialogActions sx={{ p: 2.5, px: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none' }}>
            Close
          </Button>
          {onUnsave && (
            <Button
              onClick={() => onUnsave(job.id)}
              disabled={isUnsaving}
              color="error"
              size="small"
              sx={{ textTransform: 'none' }}
            >
              {isUnsaving ? 'Removing...' : 'Remove from Saved'}
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {onOpenAiMatch && (
            <Button
              size="medium"
              variant="outlined"
              color="primary"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => onOpenAiMatch(job)}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              AI Match Score
            </Button>
          )}

          {onOpenTailorResume && (
            <Button
              size="medium"
              variant="outlined"
              color="secondary"
              startIcon={<EditNoteIcon />}
              onClick={() => onOpenTailorResume(job)}
              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
            >
              Tailor Resume ✨
            </Button>
          )}

          {onApply && (
            <Button
              variant={job.isApplied ? "outlined" : "contained"}
              color="primary"
              onClick={() => onApply(job)}
              disabled={job.isApplied || job.isActive === false}
              sx={{ textTransform: 'none', fontWeight: 700, minWidth: 120, px: 3 }}
            >
              {job.isApplied ? 'Applied' : (job.isActive === false ? 'Position Closed' : 'Apply Now')}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default JobDetailsDialog;
