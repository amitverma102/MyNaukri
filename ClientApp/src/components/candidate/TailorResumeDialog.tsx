import React, { useState } from 'react';
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
  IconButton,
  Tabs,
  Tab,
  Snackbar,
  Tooltip
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

interface TailorResumeDialogProps {
  open: boolean;
  jobId: string | null;
  jobTitle?: string;
  companyName?: string;
  onClose: () => void;
  onAppliedSuccessfully?: () => void;
}

export const TailorResumeDialog: React.FC<TailorResumeDialogProps> = ({
  open,
  jobId,
  jobTitle,
  companyName,
  onClose,
  onAppliedSuccessfully
}) => {
  const queryClient = useQueryClient();
  const [tabIndex, setTabIndex] = useState(0);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const { data: tailoredData, isLoading, error } = useQuery({
    queryKey: ['job-ai-tailor', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await api.post(`/jobs/${jobId}/ai-tailor-resume`);
      return res.data;
    },
    enabled: open && !!jobId,
    staleTime: 1000 * 60 * 10 // 10 minutes cache
  });

  const saveSummaryMutation = useMutation({
    mutationFn: async (summaryText: string) => {
      await api.post('/candidates/profile/save-tailored-summary', { summary: summaryText });
    },
    onSuccess: () => {
      setSnackbarMessage('Tailored summary successfully saved to your Candidate Profile!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      setSnackbarMessage('Failed to save summary to profile.');
    }
  });

  const applyWithPitchMutation = useMutation({
    mutationFn: async ({ jId, pitch }: { jId: string; pitch: string }) => {
      await api.post(`/jobapplications/apply/${jId}`, { coverLetter: pitch });
    },
    onSuccess: () => {
      setSnackbarMessage('Applied successfully with your tailored pitch!');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
      if (onAppliedSuccessfully) onAppliedSuccessfully();
      setTimeout(() => {
        onClose();
      }, 1200);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.Message || err.response?.data || 'Failed to apply.';
      setSnackbarMessage(typeof msg === 'string' ? msg : 'Failed to apply.');
    }
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSnackbarMessage(`${label} copied to clipboard!`);
  };

  const handleCopyAll = () => {
    if (!tailoredData) return;
    const allText = `HEADLINE:
${tailoredData.tailoredHeadline}

EXECUTIVE SUMMARY:
${tailoredData.tailoredSummary}

KEY HIGHLIGHTS:
${tailoredData.tailoredBulletPoints?.map((b: string) => `• ${b}`).join('\n')}

RECOMMENDED KEYWORDS:
${tailoredData.recommendedSkillsToAdd?.join(', ')}

COVER LETTER / PITCH:
${tailoredData.coverNotePitch}`;

    navigator.clipboard.writeText(allText);
    setSnackbarMessage('All tailored resume assets copied to clipboard!');
  };

  return (
    <>
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
                background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
                color: '#fff'
              }}
            >
              <AutoAwesomeIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                AI Resume Tailoring & Enhancer
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tailored for: {jobTitle || tailoredData?.jobTitle} • {companyName}
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
              <CircularProgress size={50} sx={{ mb: 2, color: 'secondary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Gemini AI is Tailoring Your Resume...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 1 }}>
                Analyzing job keywords, required pedagogy, and your career history to craft high-impact resume assets and application pitch.
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              Failed to generate tailored resume content. Please ensure your candidate profile is filled out and try again.
            </Alert>
          )}

          {tailoredData && !isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Top Highlights Banner */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon color="secondary" fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#5b21b6' }}>
                    ATS Optimized & Role-Specific Resume Enhancements
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyAll}
                  variant="outlined"
                  color="secondary"
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Copy All Assets
                </Button>
              </Paper>

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} textColor="secondary" indicatorColor="secondary">
                  <Tab label="Summary & Headline" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab label="Achievement Bullets" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab label="Target Keywords" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab label="Cover Pitch" sx={{ textTransform: 'none', fontWeight: 600 }} />
                </Tabs>
              </Box>

              {/* Tab 0: Headline & Summary */}
              {tabIndex === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Suggested Headline */}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        SUGGESTED PROFILE HEADLINE
                      </Typography>
                      <Tooltip title="Copy headline">
                        <IconButton size="small" onClick={() => handleCopy(tailoredData.tailoredHeadline, 'Headline')}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {tailoredData.tailoredHeadline}
                    </Typography>
                  </Paper>

                  {/* Tailored Professional Summary */}
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        TAILORED PROFESSIONAL SUMMARY
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => handleCopy(tailoredData.tailoredSummary, 'Summary')}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          Copy
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<SaveIcon />}
                          disabled={saveSummaryMutation.isPending}
                          onClick={() => saveSummaryMutation.mutate(tailoredData.tailoredSummary)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {saveSummaryMutation.isPending ? 'Saving...' : 'Save to My Profile'}
                        </Button>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.primary', whiteSpace: 'pre-line' }}>
                      {tailoredData.tailoredSummary}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Tab 1: Experience Bullets */}
              {tabIndex === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    These impact statements incorporate strong pedagogical action verbs and metrics tailored to the requirements of this role:
                  </Typography>

                  {tailoredData.tailoredBulletPoints?.map((bullet: string, idx: number) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.3 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.primary' }}>
                          {bullet}
                        </Typography>
                      </Box>
                      <Tooltip title="Copy bullet point">
                        <IconButton size="small" onClick={() => handleCopy(bullet, `Bullet ${idx + 1}`)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Tab 2: Target Keywords */}
              {tabIndex === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Include these essential keywords from the Job Description across your resume skills and project descriptions to pass ATS screeners:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {tailoredData.recommendedSkillsToAdd?.map((skill: string, idx: number) => (
                      <Chip
                        key={idx}
                        label={skill}
                        color="secondary"
                        variant="outlined"
                        onClick={() => handleCopy(skill, skill)}
                        icon={<ContentCopyIcon fontSize="small" />}
                        sx={{ fontWeight: 600, py: 2, px: 1 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Tab 3: Cover Pitch */}
              {tabIndex === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FormatQuoteIcon fontSize="small" color="primary" /> CUSTOM APPLICATION PITCH / COVER NOTE
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => handleCopy(tailoredData.coverNotePitch, 'Cover Pitch')}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Copy Pitch
                      </Button>
                    </Box>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.primary', whiteSpace: 'pre-line' }}>
                      {tailoredData.coverNotePitch}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none' }}>
            Close
          </Button>
          {tailoredData && jobId && (
            <Button
              variant="contained"
              color="success"
              startIcon={<SendIcon />}
              disabled={applyWithPitchMutation.isPending}
              onClick={() => applyWithPitchMutation.mutate({ jId: jobId, pitch: tailoredData.coverNotePitch })}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {applyWithPitchMutation.isPending ? 'Submitting Application...' : 'Apply with this Tailored Pitch'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={3500}
        onClose={() => setSnackbarMessage(null)}
        message={snackbarMessage}
      />
    </>
  );
};

export default TailorResumeDialog;
