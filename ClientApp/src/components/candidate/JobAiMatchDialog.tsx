import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Paper,
  Alert,
  IconButton
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';

interface JobAiMatchDialogProps {
  open: boolean;
  jobId: string | null;
  jobTitle?: string;
  companyName?: string;
  onClose: () => void;
  onOpenTailor?: (jobId: string) => void;
}

export const JobAiMatchDialog: React.FC<JobAiMatchDialogProps> = ({
  open,
  jobId,
  jobTitle,
  companyName,
  onClose,
  onOpenTailor
}) => {
  const { data: matchData, isLoading, error } = useQuery({
    queryKey: ['job-ai-match', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await api.get(`/jobs/${jobId}/ai-match`);
      return res.data;
    },
    enabled: open && !!jobId,
    staleTime: 1000 * 60 * 5 // 5 minutes cache
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 55) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getFitBadgeColor = (fitLevel: string) => {
    switch (fitLevel?.toLowerCase()) {
      case 'high': return 'success';
      case 'moderate': return 'warning';
      default: return 'error';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 1
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(25, 118, 210, 0.1)',
              color: 'primary.main'
            }}
          >
            <AutoAwesomeIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              AI Resume & ATS Fit Analysis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {jobTitle || matchData?.jobTitle} • {companyName || matchData?.companyName}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {isLoading && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={50} sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Analyzing Compatibility...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Our AI engine is evaluating your skills, experience, and credentials against the Job Description.
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            Unable to analyze job fit. Please ensure your candidate profile has uploaded resume details.
          </Alert>
        )}

        {matchData && !isLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Top Score Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexWrap: 'wrap'
              }}
            >
              {/* Circular Gauge */}
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={96}
                  thickness={6}
                  sx={{ color: '#e2e8f0' }}
                />
                <CircularProgress
                  variant="determinate"
                  value={matchData.matchScore || 0}
                  size={96}
                  thickness={6}
                  sx={{
                    color: getScoreColor(matchData.matchScore),
                    position: 'absolute',
                    left: 0
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h5" component="div" sx={{ fontWeight: 800, lineHeight: 1 }}>
                    {Math.round(matchData.matchScore)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    ATS MATCH
                  </Typography>
                </Box>
              </Box>

              {/* Verdict Summary */}
              <Box sx={{ flex: 1, minWidth: 240 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {matchData.fitLevel} Fitment Level
                  </Typography>
                  <Chip
                    label={matchData.fitLevel}
                    color={getFitBadgeColor(matchData.fitLevel) as any}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {matchData.matchSummary}
                </Typography>
              </Box>
            </Paper>

            {/* Skills Gap Analysis */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon fontSize="small" color="primary" /> Skills Compatibility & Gap Analysis
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {/* Matched Skills */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon fontSize="small" color="success" /> Matched Skills ({matchData.matchedSkills?.length || 0})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {matchData.matchedSkills?.length > 0 ? (
                      matchData.matchedSkills.map((s: string, i: number) => (
                        <Chip
                          key={i}
                          label={s}
                          size="small"
                          sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 600 }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">No direct skill matches detected.</Typography>
                    )}
                  </Box>
                </Paper>

                {/* Missing Skills */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fffbeb', borderColor: '#fde68a' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#92400e', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <WarningAmberIcon fontSize="small" color="warning" /> Missing / Target Skills ({matchData.missingSkills?.length || 0})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {matchData.missingSkills?.length > 0 ? (
                      matchData.missingSkills.map((s: string, i: number) => (
                        <Chip
                          key={i}
                          label={s}
                          size="small"
                          sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 600 }}
                        />
                      ))
                    ) : (
                      <Typography variant="caption" color="text.secondary">No critical skill gaps identified!</Typography>
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>

            {/* Fitment Breakdown Cards */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Prerequisites & Qualifications Alignment
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                {/* Experience */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <WorkOutlineIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Experience</Typography>
                    </Box>
                    <Chip
                      label={matchData.experienceMatch?.isMatch ? "Aligned" : "Review"}
                      size="small"
                      color={matchData.experienceMatch?.isMatch ? "success" : "warning"}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Required: {matchData.experienceMatch?.required || '2-5 yrs'}
                  </Typography>
                  <Typography variant="caption" color="text.primary" sx={{ display: 'block', fontWeight: 600 }}>
                    Profile: {matchData.experienceMatch?.candidate || 'Not specified'}
                  </Typography>
                  {matchData.experienceMatch?.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                      {matchData.experienceMatch.notes}
                    </Typography>
                  )}
                </Paper>

                {/* Education */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <SchoolOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Education</Typography>
                    </Box>
                    <Chip
                      label={matchData.educationMatch?.isMatch ? "Aligned" : "Review"}
                      size="small"
                      color={matchData.educationMatch?.isMatch ? "success" : "warning"}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Required: {matchData.educationMatch?.required || 'Subject Degree / B.Ed'}
                  </Typography>
                  <Typography variant="caption" color="text.primary" sx={{ display: 'block', fontWeight: 600 }}>
                    Profile: {matchData.educationMatch?.candidate || 'Not specified'}
                  </Typography>
                  {matchData.educationMatch?.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                      {matchData.educationMatch.notes}
                    </Typography>
                  )}
                </Paper>

                {/* Location */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <PlaceOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Location</Typography>
                    </Box>
                    <Chip
                      label={matchData.locationMatch?.isMatch ? "Aligned" : "Review"}
                      size="small"
                      color={matchData.locationMatch?.isMatch ? "success" : "default"}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Job: {matchData.locationMatch?.jobLocation || 'Campus'}
                  </Typography>
                  <Typography variant="caption" color="text.primary" sx={{ display: 'block', fontWeight: 600 }}>
                    Profile: {matchData.locationMatch?.candidateLocation || 'Flexible'}
                  </Typography>
                  {matchData.locationMatch?.notes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                      {matchData.locationMatch.notes}
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Box>

            {/* Strengths & Actionable ATS Advice */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              {matchData.strengths?.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon fontSize="small" color="success" /> Candidate Strengths
                  </Typography>
                  <Box component="ul" sx={{ pl: 2.5, m: 0, '& li': { fontSize: '0.85rem', color: 'text.secondary', mb: 0.5 } }}>
                    {matchData.strengths.map((st: string, idx: number) => (
                      <li key={idx}>{st}</li>
                    ))}
                  </Box>
                </Paper>
              )}

              {matchData.improvementSuggestions?.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fbfcfe' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, color: '#0284c7' }}>
                    <LightbulbOutlinedIcon fontSize="small" color="primary" /> Recommendations to Stand Out
                  </Typography>
                  <Box component="ul" sx={{ pl: 2.5, m: 0, '& li': { fontSize: '0.85rem', color: 'text.secondary', mb: 0.5 } }}>
                    {matchData.improvementSuggestions.map((sug: string, idx: number) => (
                      <li key={idx}>{sug}</li>
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none' }}>
          Close
        </Button>
        {onOpenTailor && jobId && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditNoteIcon />}
            onClick={() => {
              onClose();
              onOpenTailor(jobId);
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)'
            }}
          >
            Tailor Resume for this Job ✨
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default JobAiMatchDialog;
