import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, CardContent, Typography, Container, CircularProgress, Box,
  Chip, IconButton, Avatar, Button, Tooltip, Paper
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SchoolIcon from '@mui/icons-material/School';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useNavigate } from 'react-router-dom';
import api, { getMediaUrl } from '../../api/axios';
import { formatRelativeTime } from '../../utils/dateUtils';
import ApplyJobDialog from './ApplyJobDialog';
import JobAiMatchDialog from './JobAiMatchDialog';
import TailorResumeDialog from './TailorResumeDialog';
import JobDetailsDialog, { type JobDetailsData } from './JobDetailsDialog';

export default function SavedJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog states
  const [applyDialogJob, setApplyDialogJob] = useState<any | null>(null);
  const [detailsJob, setDetailsJob] = useState<JobDetailsData | null>(null);
  const [matchDialogJob, setMatchDialogJob] = useState<any | null>(null);
  const [tailorDialogJob, setTailorDialogJob] = useState<any | null>(null);

  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: async () => {
      const response = await api.get('/savedjobs');
      return response.data;
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post(`/savedjobs/${jobId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      // If the currently open details dialog is for this job, close it or update it
      if (detailsJob && removeMutation.variables === detailsJob.id) {
        setDetailsJob(null);
      }
    },
    onError: (error: any) => {
      alert(error.response?.data || 'Failed to remove saved job.');
    }
  });

  const mapSaveToDetails = (save: any): JobDetailsData => ({
    id: save.jobId,
    title: save.jobTitle,
    description: save.jobDescription,
    requirements: save.jobRequirements,
    minSalary: save.minSalary,
    maxSalary: save.maxSalary,
    jobType: save.jobType,
    location: save.jobLocation,
    keywords: save.keywords,
    companyName: save.companyName,
    institutionId: save.institutionId,
    institutionLogoUrl: save.institutionLogoUrl,
    createdAt: save.jobCreatedAt || save.createdAt,
    isActive: save.isActive,
    isPlatinum: save.isPlatinum,
    isApplied: save.isApplied,
    workMode: save.workMode,
    boardAffiliation: save.boardAffiliation,
    subjectDepartment: save.subjectDepartment,
    screeningQuestionsJson: save.screeningQuestionsJson
  });

  const handleOpenDetails = (save: any, e?: React.MouseEvent) => {
    if (e && (e.ctrlKey || e.metaKey)) {
      // Let standard browser open in new tab
      return;
    }
    if (e) {
      e.preventDefault();
    }
    setDetailsJob(mapSaveToDetails(save));
  };

  const handleInitiateApply = (saveOrJob: any) => {
    const jobPayload = {
      id: saveOrJob.jobId || saveOrJob.id,
      title: saveOrJob.jobTitle || saveOrJob.title,
      companyName: saveOrJob.companyName,
      institutionLogoUrl: saveOrJob.institutionLogoUrl,
      location: saveOrJob.jobLocation || saveOrJob.location,
      screeningQuestionsJson: saveOrJob.screeningQuestionsJson
    };
    setApplyDialogJob(jobPayload);
  };

  const formatSalary = (min?: number, max?: number) => {
    if (min && max) {
      if (max >= 100000) {
        return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L PA`;
      }
      return `₹${min / 1000}K - ₹${max / 1000}K`;
    }
    if (min) return `From ₹${min / 1000}K`;
    if (max) return `Up to ₹${max / 1000}K`;
    return null;
  };

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '4rem auto' }} />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: 'text.primary' }}>
            <BookmarkIcon sx={{ mr: 1, color: 'primary.main' }} />
            My Saved Jobs ({savedJobs?.length || 0})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Review, inspect details, and apply to openings you have bookmarked.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/jobs')}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          Browse More Jobs
        </Button>
      </Box>

      {!savedJobs || savedJobs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <BookmarkIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
          <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600, mb: 1 }}>
            You haven't saved any jobs yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mb: 3 }}>
            Bookmark exciting roles while searching to easily compare them, track updates, and apply when ready.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/jobs')}
            sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            Explore Open Vacancies
          </Button>
        </Paper>
      ) : (
        savedJobs.map((save: any) => {
          const salaryText = formatSalary(save.minSalary, save.maxSalary);
          const jobTypeStr = save.jobType === 'FullTime' ? 'Full Time' : (save.jobType || 'Full Time');

          return (
            <Card
              key={save.id}
              sx={{
                mb: 2.5,
                borderRadius: 2.5,
                transition: 'all 0.2s ease-in-out',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                '&:hover': {
                  boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                  borderColor: '#cbd5e1',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                  {/* Left Column: Avatar + Details */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: 280 }}>
                    <Avatar
                      src={getMediaUrl(save.institutionLogoUrl)}
                      variant="rounded"
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        p: 0.5,
                        mt: 0.5,
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        cursor: save.institutionId && save.institutionId !== '00000000-0000-0000-0000-000000000000' ? 'pointer' : 'default',
                        '& img': { objectFit: 'contain' }
                      }}
                      onClick={() => {
                        if (save.institutionId && save.institutionId !== '00000000-0000-0000-0000-000000000000') {
                          navigate(`/institution/${save.institutionId}`);
                        }
                      }}
                    >
                      <SchoolIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      {/* Job Title & Badges */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography
                          variant="h6"
                          component="a"
                          href={`/jobs/${save.jobId}`}
                          onClick={(e) => handleOpenDetails(save, e)}
                          sx={{
                            fontWeight: 700,
                            color: 'text.primary',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            lineHeight: 1.3,
                            transition: 'color 0.15s ease',
                            '&:hover': {
                              color: 'primary.main',
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {save.jobTitle}
                        </Typography>

                        {save.isPlatinum && (
                          <Chip size="small" label="⭐ Featured" color="secondary" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                        )}
                        {save.workMode && (
                          <Chip size="small" label={save.workMode} variant="outlined" icon={<LaptopMacIcon fontSize="small" />} sx={{ height: 22 }} />
                        )}
                        {save.boardAffiliation && (
                          <Chip size="small" label={save.boardAffiliation} color="info" variant="outlined" icon={<SchoolIcon fontSize="small" />} sx={{ height: 22 }} />
                        )}
                        {save.subjectDepartment && (
                          <Chip size="small" label={save.subjectDepartment} sx={{ bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 600, height: 22 }} />
                        )}
                      </Box>

                      {/* Institution Name, Job ID, and Date */}
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap', mb: 1 }}>
                        <BusinessIcon fontSize="small" color="action" />
                        {save.institutionId && save.institutionId !== '00000000-0000-0000-0000-000000000000' ? (
                          <Tooltip title="View Institution Profile & all vacancies">
                            <span
                              onClick={() => navigate(`/institution/${save.institutionId}`)}
                              style={{ cursor: 'pointer', color: '#1976d2', textDecoration: 'underline', fontWeight: 600 }}
                            >
                              {save.companyName || 'Verified Institution'}
                            </span>
                          </Tooltip>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{save.companyName || 'Verified Institution'}</span>
                        )}

                        <span>•</span>

                        <Tooltip title="Click to view full job details">
                          <Typography
                            component="a"
                            href={`/jobs/${save.jobId}`}
                            onClick={(e) => handleOpenDetails(save, e)}
                            variant="body2"
                            sx={{
                              cursor: 'pointer',
                              color: '#1976d2',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              display: 'inline'
                            }}
                          >
                            Job ID: {save.jobId?.substring(0, 8)}
                          </Typography>
                        </Tooltip>

                        {save.jobCreatedAt && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#64748b', fontSize: '0.8rem', marginLeft: '4px' }}>
                            <AccessTimeIcon sx={{ fontSize: '0.85rem' }} /> Posted {formatRelativeTime(save.jobCreatedAt)}
                          </span>
                        )}
                      </Typography>

                      {/* Location, Job Type, Salary & Status */}
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                          <LocationOnIcon fontSize="small" sx={{ mr: 0.3, color: 'text.secondary' }} />
                          {save.jobLocation || 'Location Not Specified'}
                        </Box>
                        <span>|</span>
                        <span>{jobTypeStr}</span>
                        {salaryText && (
                          <>
                            <span>|</span>
                            <Box component="span" sx={{ fontWeight: 600, color: '#15803d' }}>
                              {salaryText}
                            </Box>
                          </>
                        )}
                        <Chip
                          label={save.isActive ? 'Active' : 'Closed'}
                          color={save.isActive ? 'success' : 'default'}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, ml: 0.5 }}
                        />
                      </Typography>

                      {/* Description Snippet */}
                      {save.jobDescription && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mb: 1.5,
                            lineHeight: 1.5
                          }}
                        >
                          {save.jobDescription}
                        </Typography>
                      )}

                      {/* Candidate AI Helper Tools */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<AutoAwesomeIcon />}
                          onClick={() => {
                            setMatchDialogJob({
                              id: save.jobId,
                              title: save.jobTitle,
                              companyName: save.companyName
                            });
                          }}
                          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                        >
                          AI Match Score
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<EditNoteIcon />}
                          onClick={() => {
                            setTailorDialogJob({
                              id: save.jobId,
                              title: save.jobTitle,
                              companyName: save.companyName
                            });
                          }}
                          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, fontSize: '0.8rem' }}
                        >
                          Tailor Resume ✨
                        </Button>
                      </Box>
                    </Box>
                  </Box>

                  {/* Right Column: APPLY Button & Unsave Action */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: { xs: 1, sm: 0 }, alignSelf: { xs: 'flex-start', sm: 'center' } }}>
                    <Tooltip title="Remove from Saved Jobs">
                      <IconButton
                        color="error"
                        onClick={() => removeMutation.mutate(save.jobId)}
                        disabled={removeMutation.isPending}
                        sx={{
                          border: '1px solid #fee2e2',
                          bgcolor: '#fef2f2',
                          '&:hover': { bgcolor: '#fee2e2' }
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Button
                      variant={save.isApplied ? "outlined" : "contained"}
                      color="primary"
                      onClick={() => handleInitiateApply(save)}
                      disabled={save.isApplied || !save.isActive}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 105,
                        px: 2.5
                      }}
                    >
                      {save.isApplied ? 'Applied' : (!save.isActive ? 'Closed' : 'Apply Now')}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Job Details Modal Dialog */}
      <JobDetailsDialog
        open={Boolean(detailsJob)}
        job={detailsJob}
        onClose={() => setDetailsJob(null)}
        onApply={(job) => {
          handleInitiateApply(job);
        }}
        onOpenAiMatch={(job) => {
          setMatchDialogJob({
            id: job.id,
            title: job.title,
            companyName: job.companyName
          });
        }}
        onOpenTailorResume={(job) => {
          setTailorDialogJob({
            id: job.id,
            title: job.title,
            companyName: job.companyName
          });
        }}
        onUnsave={(jobId) => {
          removeMutation.mutate(jobId);
        }}
        isUnsaving={removeMutation.isPending}
      />

      {/* Apply Job Dialog */}
      <ApplyJobDialog
        open={Boolean(applyDialogJob)}
        job={applyDialogJob}
        onClose={() => setApplyDialogJob(null)}
        onAppliedSuccessfully={() => {
          queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs-recommendations'] });
          queryClient.invalidateQueries({ queryKey: ['applications'] });
          // If details dialog is currently open, update its state
          if (detailsJob) {
            setDetailsJob(prev => prev ? { ...prev, isApplied: true } : null);
          }
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
          queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['jobs-recommendations'] });
        }}
      />
    </Container>
  );
}
