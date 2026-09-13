import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Chip,
  IconButton,
  Avatar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SchoolIcon from '@mui/icons-material/School';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { getMediaUrl } from '../../api/axios';

interface ApplyJobDialogProps {
  open: boolean;
  job: {
    id: string;
    title: string;
    companyName?: string;
    institutionLogoUrl?: string;
    location?: string;
    screeningQuestionsJson?: string;
  } | null;
  initialCoverLetter?: string;
  onClose: () => void;
  onAppliedSuccessfully?: () => void;
}

export const ApplyJobDialog: React.FC<ApplyJobDialogProps> = ({
  open,
  job,
  initialCoverLetter = '',
  onClose,
  onAppliedSuccessfully
}) => {
  const queryClient = useQueryClient();
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter);
  const [resumeOption, setResumeOption] = useState<'profile' | 'upload'>('profile');
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [updateProfileResume, setUpdateProfileResume] = useState(true);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Candidate Profile to check existing resume
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['candidate-profile-for-apply'],
    queryFn: async () => {
      const res = await api.get('/candidates/profile');
      return res.data;
    },
    enabled: open
  });

  // Reset/sync state when job changes or dialog opens
  useEffect(() => {
    if (open && job) {
      setCoverLetter(initialCoverLetter || '');
      setNewResumeFile(null);
      setErrorMsg(null);

      // Check if job has screening questions
      let questions: string[] = [];
      if (job.screeningQuestionsJson) {
        try {
          const parsed = JSON.parse(job.screeningQuestionsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            questions = parsed;
          }
        } catch (e) {
          console.error('Failed to parse screening questions:', e);
        }
      }

      const initialAnswers: Record<string, string> = {};
      questions.forEach((q) => {
        initialAnswers[q] = '';
      });
      setScreeningAnswers(initialAnswers);
    }
  }, [open, job, initialCoverLetter]);

  // Adjust default resume selection if user has no resume on profile
  useEffect(() => {
    if (profile && !profile.resumeUrl) {
      setResumeOption('upload');
    } else {
      setResumeOption('profile');
    }
  }, [profile]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error('No job selected.');

      // Validation
      if (resumeOption === 'upload' && !newResumeFile && !profile?.resumeUrl) {
        throw new Error('Please upload a resume file to submit your application.');
      }

      const formData = new FormData();
      if (resumeOption === 'upload' && newResumeFile) {
        formData.append('resumeFile', newResumeFile);
        formData.append('updateProfileResume', String(updateProfileResume));
      } else {
        formData.append('updateProfileResume', 'false');
      }

      if (coverLetter.trim()) {
        formData.append('coverLetter', coverLetter.trim());
      }

      const questionsList = Object.keys(screeningAnswers);
      if (questionsList.length > 0) {
        formData.append('screeningAnswersJson', JSON.stringify(screeningAnswers));
      }

      const res = await api.post(`/jobapplications/apply-with-resume/${job.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (onAppliedSuccessfully) {
        onAppliedSuccessfully();
      }
      onClose();
    },
    onError: (err: any) => {
      const data = err.response?.data;
      const msg = typeof data === 'string' && data ? data : (data?.title || data?.message || err.message || 'Failed to submit application.');
      setErrorMsg(msg);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validExtensions = ['.pdf', '.doc', '.docx'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExt)) {
        setErrorMsg('Please upload a PDF or Word document (.pdf, .doc, .docx).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Resume file size must not exceed 10 MB.');
        return;
      }
      setErrorMsg(null);
      setNewResumeFile(file);
      setResumeOption('upload');
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <Avatar
            src={getMediaUrl(job.institutionLogoUrl)}
            variant="rounded"
            sx={{
              width: 50,
              height: 50,
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              p: 0.5,
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              '& img': { objectFit: 'contain' }
            }}
          >
            <SchoolIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                Apply to {job.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
              {job.companyName && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {job.companyName}
                </Typography>
              )}
              {job.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnIcon fontSize="inherit" color="action" />
                  <Typography variant="caption">{job.location}</Typography>
                </Box>
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
        {errorMsg && (
          <Alert severity="error" onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}

        {/* 1. Resume Selection & Upload */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <DescriptionIcon color="primary" fontSize="small" />
            Resume
          </Typography>

          {isProfileLoading ? (
            <CircularProgress size={24} />
          ) : (
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={resumeOption}
                onChange={(e) => setResumeOption(e.target.value as 'profile' | 'upload')}
              >
                {/* Profile Resume Option */}
                {profile?.resumeUrl ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 1.5,
                      borderRadius: 2,
                      border: resumeOption === 'profile' ? '2px solid' : '1px solid',
                      borderColor: resumeOption === 'profile' ? 'primary.main' : 'divider',
                      bgcolor: resumeOption === 'profile' ? 'action.hover' : 'background.paper',
                      cursor: 'pointer'
                    }}
                    onClick={() => setResumeOption('profile')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        value="profile"
                        control={<Radio />}
                        label={
                          <Box sx={{ ml: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Use current profile resume
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Existing resume uploaded on your profile
                            </Typography>
                          </Box>
                        }
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        startIcon={<PictureAsPdfIcon fontSize="small" />}
                        href={getMediaUrl(profile.resumeUrl) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ textTransform: 'none', ml: 1 }}
                      >
                        View Resume
                      </Button>
                    </Box>
                  </Paper>
                ) : (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    You don't have a default resume uploaded yet. Please upload a resume below to proceed.
                  </Alert>
                )}

                {/* Upload Different Resume Option */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: resumeOption === 'upload' ? '2px solid' : '1px solid',
                    borderColor: resumeOption === 'upload' ? 'primary.main' : 'divider',
                    bgcolor: resumeOption === 'upload' ? 'action.hover' : 'background.paper'
                  }}
                >
                  <FormControlLabel
                    value="upload"
                    control={<Radio />}
                    label={
                      <Box sx={{ ml: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {profile?.resumeUrl ? 'Upload a new or tailored resume for this job' : 'Upload your resume'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Supports PDF or Word documents (up to 10 MB)
                        </Typography>
                      </Box>
                    }
                  />

                  {resumeOption === 'upload' && (
                    <Box sx={{ mt: 2, pl: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUploadIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          {newResumeFile ? 'Choose Different File' : 'Select Resume File'}
                          <input
                            type="file"
                            hidden
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                          />
                        </Button>

                        {newResumeFile && (
                          <Chip
                            icon={<CheckCircleIcon color="success" />}
                            label={`${newResumeFile.name} (${(newResumeFile.size / 1024).toFixed(0)} KB)`}
                            color="success"
                            variant="outlined"
                            onDelete={() => setNewResumeFile(null)}
                          />
                        )}
                      </Box>

                      {newResumeFile && (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={updateProfileResume}
                              onChange={(e) => setUpdateProfileResume(e.target.checked)}
                              color="primary"
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="caption" color="text.secondary">
                              Also save this as my default resume in my candidate profile
                            </Typography>
                          }
                          sx={{ mt: 1, display: 'block' }}
                        />
                      )}
                    </Box>
                  )}
                </Paper>
              </RadioGroup>
            </FormControl>
          )}
        </Box>

        {/* 2. Optional Cover Letter */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Cover Letter <Typography component="span" variant="caption" color="text.secondary">(Optional)</Typography>
            </Typography>
            <Chip label="Recommended" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Highlight why your qualifications and passion make you the ideal choice for this position.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={5}
            placeholder={"Dear Hiring Manager,\n\nI am excited to apply for this position because..."}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            variant="outlined"
            slotProps={{ htmlInput: { maxLength: 4000 } }}
            helperText={`${coverLetter.length}/4000 characters`}
          />
        </Box>

        {/* 3. Screening Questions (if any) */}
        {Object.keys(screeningAnswers).length > 0 && (
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Screening Questions
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              The hiring organization requests answers to the following questions:
            </Typography>
            {Object.keys(screeningAnswers).map((question, idx) => (
              <Box key={idx} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {idx + 1}. {question}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Type your response..."
                  value={screeningAnswers[question] || ''}
                  onChange={(e) =>
                    setScreeningAnswers((prev) => ({
                      ...prev,
                      [question]: e.target.value
                    }))
                  }
                />
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, px: 3, justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={() => applyMutation.mutate()}
          variant="contained"
          color="primary"
          startIcon={applyMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          disabled={applyMutation.isPending || (resumeOption === 'upload' && !newResumeFile && !profile?.resumeUrl)}
          sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
        >
          {applyMutation.isPending ? 'Submitting Application...' : 'Submit Application'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplyJobDialog;
