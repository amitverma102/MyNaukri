import { useState, useEffect } from 'react';
import { 
  Typography, Container, Paper, Box, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, Select, InputLabel, FormControl, IconButton,
  Card, CardContent, List, ListItem, ListItemIcon, ListItemText, Divider, Avatar, Tooltip, Alert,
  FormControlLabel, Checkbox, CircularProgress
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WorkIcon from '@mui/icons-material/Work';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircle';
import CommentIcon from '@mui/icons-material/Comment';
import SendIcon from '@mui/icons-material/Send';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import SchoolIcon from '@mui/icons-material/School';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VideocamIcon from '@mui/icons-material/Videocam';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import api, { API_BASE_URL, getMediaUrl } from '../api/axios';
import { formatDateTime, formatRelativeTime } from '../utils/dateUtils';
import { downloadCalendarInvite } from '../utils/calendarDownload';
import EmbeddedZoomMeetingDialog from './interview/EmbeddedZoomMeetingDialog';
import { parseZoomMeeting } from '../utils/zoomUtils';

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  minSalary: number;
  maxSalary: number;
  jobType: string;
  location: string;
  isActive: boolean;
  keywords?: string;
  companyName?: string;
  isPlatinum?: boolean;
  workMode?: string;
  boardAffiliation?: string;
  subjectDepartment?: string;
  screeningQuestionsJson?: string;
  institutionLogoUrl?: string;
}

interface CreditTransaction {
  id: string;
  credits: number;
  transactionType: string;
  description: string;
  createdAt: string;
  balanceBefore: number;
  balanceAfter: number;
}

interface ApplicationComment {
  id: string;
  jobApplicationId: string;
  userId: string;
  comment: string;
  createdAt: string;
}

interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  aiMatchScore: number | null;
  aiFeedback: string;
  interviewDate: string | null;
  interviewMode?: 'Online' | 'InPerson' | 'Telephonic' | number | string | null;
  interviewLink: string | null;
  interviewVenue?: string | null;
  interviewDetails?: string | null;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  screeningAnswersJson?: string;
  coverLetter?: string;
  candidateResumeUrl?: string;
  candidateProfilePictureUrl?: string;
}

const statusMap: Record<string, string> = {
  'Applied': 'Applied',
  'UnderReview': 'Under Review',
  'Shortlisted': 'Shortlisted',
  'InterviewScheduled': 'Interview Scheduled',
  'Offered': 'Offered',
  'Rejected': 'Rejected',
  'Hired': 'Hired'
};

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePictureUrl?: string;
  resumeUrl: string;
  skills: string;
  summary: string;
  totalExperienceYears: number;
  currentLocation: string;
  classesTaught: string;
  boardsTaught: string;
  education: string;
  gender?: number;
  differentlyAbled?: boolean;
  exServiceman?: boolean;
  hasUnlockedContact?: boolean;
  hasDownloadedResume?: boolean;
  noticePeriod?: string;
  isCtetQualified?: boolean;
  demoVideoUrl?: string;
  demoVideoStatus?: string;
  demoVideoSubject?: string;
  demoVideoSummary?: string;
  joiningAvailability?: string;
  updatedAt?: string;
  aiRecommendationScore?: number;
  aiRecommendationReason?: string;
}

const jobTypeMap: Record<string, string> = {
  'FullTime': 'Full Time',
  'PartTime': 'Part Time',
  'Contract': 'Contract',
  'Internship': 'Internship'
};

export default function RecruiterDashboard() {

  const [activeView, setActiveView] = useState<'dashboard' | 'jobs' | 'interviews' | 'resdex' | 'credits'>('dashboard');
  const [interviewTabFilter, setInterviewTabFilter] = useState<'all' | 'upcoming' | 'pending'>('all');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<JobApplication[]>([]);
  const [activeMeetingApp, setActiveMeetingApp] = useState<any | null>(null);
  
  const [creditBalance, setCreditBalance] = useState<number>(0);

  const [creditRates, setCreditRates] = useState<any>({ contactViewRate: 2, resumeDownloadRate: 5 });
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  
  // Modals state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<Job> | null>(null);
  const [isParsingJd, setIsParsingJd] = useState(false);
  const [parsedJdInfo, setParsedJdInfo] = useState<any | null>(null);
  const [jdParseSuccess, setJdParseSuccess] = useState<string | null>(null);
  
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [currentJobApplicants, setCurrentJobApplicants] = useState<JobApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // AI Matched Candidates Modal state
  const [isAiMatchesModalOpen, setIsAiMatchesModalOpen] = useState(false);
  const [selectedJobForMatches, setSelectedJobForMatches] = useState<Job | null>(null);
  const [aiMatchedCandidates, setAiMatchedCandidates] = useState<Candidate[]>([]);
  const [isLoadingAiMatches, setIsLoadingAiMatches] = useState(false);

  // Applicant Comments state
  const [activeCommentAppId, setActiveCommentAppId] = useState<string | null>(null);
  const [appComments, setAppComments] = useState<ApplicationComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewMode, setInterviewMode] = useState<'Online' | 'InPerson' | 'Telephonic'>('Online');
  const [interviewLink, setInterviewLink] = useState('');
  const [interviewVenue, setInterviewVenue] = useState('');
  const [interviewDetails, setInterviewDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [viewingApplication, setViewingApplication] = useState<JobApplication | null>(null);

  // Resdex State
  const [resdexQuery, setResdexQuery] = useState('');
  const [resdexLocation, setResdexLocation] = useState('');
  const [resdexGender, setResdexGender] = useState('');
  const [resdexNoticePeriod, setResdexNoticePeriod] = useState('');
  const [resdexCtet, setResdexCtet] = useState('');
  const [resdexLastUpdated, setResdexLastUpdated] = useState('');
  const [resdexVerifiedDemo, setResdexVerifiedDemo] = useState(false);
  const [resdexSortBy, setResdexSortBy] = useState<'aiMatch' | 'lastUpdated' | 'experience'>('aiMatch');
  const [resdexResults, setResdexResults] = useState<Candidate[]>([]);
  const [isSearchingResdex, setIsSearchingResdex] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchInterviews();
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const balRes = await api.get('/recruiter/credits');
      setCreditBalance(balRes.data.availableCredits || balRes.data.balance || 0);

      if (balRes.data.rates) {
        setCreditRates(balRes.data.rates);
      }
      const histRes = await api.get('/recruiter/credits/transactions');
      setCreditHistory(histRes.data);
    } catch (err) {
      console.error('Failed to fetch credits', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/recruiter');
      setJobs(response.data);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  const fetchInterviews = async () => {
    try {
      const response = await api.get('/jobapplications/interviews');
      setInterviews(response.data);
    } catch (err) {
      console.error('Failed to fetch interviews', err);
    }
  };

  const handleResdexSearch = async () => {
    try {
      setIsSearchingResdex(true);
      let url = `/candidates/search?keyword=${encodeURIComponent(resdexQuery)}`;
      if (resdexLocation) url += `&location=${encodeURIComponent(resdexLocation)}`;
      if (resdexGender) url += `&gender=${resdexGender}`;
      if (resdexNoticePeriod) url += `&noticePeriod=${encodeURIComponent(resdexNoticePeriod)}`;
      if (resdexCtet !== '') url += `&isCtetQualified=${resdexCtet === 'true'}`;
      if (resdexVerifiedDemo) url += `&verifiedDemoOnly=true`;
      if (resdexLastUpdated) url += `&lastUpdatedDays=${resdexLastUpdated}`;
      if (resdexSortBy) url += `&sortBy=${resdexSortBy}`;
      
      const response = await api.get(url);
      setResdexResults(response.data);
    } catch (err) {
      console.error('Failed to search candidates', err);
      setResdexResults([]);
    } finally {
      setIsSearchingResdex(false);
    }
  };

  const openCommentsModal = async (applicationId: string) => {
    try {
      setActiveCommentAppId(applicationId);
      setIsCommentsOpen(true);
      setIsLoadingComments(true);
      const res = await api.get(`/job-applications/${applicationId}/comments`);
      setAppComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
      setAppComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const submitComment = async () => {
    if (!activeCommentAppId || !newCommentText.trim()) return;
    try {
      await api.post(`/job-applications/${activeCommentAppId}/comments`, { comment: newCommentText.trim() });
      setNewCommentText('');
      const res = await api.get(`/job-applications/${activeCommentAppId}/comments`);
      setAppComments(res.data);
    } catch (err) {
      console.error('Failed to submit comment', err);
    }
  };

  const handleUnlockContact = async (candidateId: string) => {
    try {
      const rate = creditRates.contactViewRate || 2;
      if (!window.confirm(`This will deduct ${rate} credits. Continue?`)) return;
      const response = await api.post(`/candidates/${candidateId}/contact/unlock`);
      alert(`Contact Unlocked!\nEmail: ${response.data.email}\nPhone: ${response.data.phoneNumber}`);
      fetchCredits(); // update balance
      handleResdexSearch(); // re-fetch search to update flags
      setAiMatchedCandidates(prev => prev.map(c => c.id === candidateId ? {
        ...c,
        hasUnlockedContact: true,
        email: response.data.email,
        phoneNumber: response.data.phoneNumber,
        firstName: response.data.firstName || (c.firstName ? c.firstName.replace(/\*\*\*/, '') : ''),
        lastName: response.data.lastName || (c.lastName ? c.lastName.replace(/\*\*\*/, '') : '')
      } : c));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to unlock contact. Insufficient credits?");
    }
  };

  const handleDownloadResume = async (candidate: Candidate) => {
    try {
      if (!candidate.hasDownloadedResume) {
        const rate = creditRates.resumeDownloadRate || 5;
        if (!window.confirm(`Downloading resume will deduct ${rate} credits. Continue?`)) return;
      }
      const response = await api.get(`/candidates/${candidate.id}/resume/download`);
      const fullUrl = response.data.resumeUrl.startsWith('http') 
        ? response.data.resumeUrl 
        : `${API_BASE_URL}${response.data.resumeUrl}`;
      window.open(fullUrl, '_blank');
      if (!candidate.hasDownloadedResume) {
        fetchCredits(); // update balance
        handleResdexSearch(); // re-fetch search to update flags
        setAiMatchedCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, hasDownloadedResume: true } : c));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to download resume. Insufficient credits?");
    }
  };

  const handleJdFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some(ext => lowerName.endsWith(ext));
    if (!isAllowed) {
      setFormError('Unsupported file type. Please upload a PDF, Word (.docx, .doc), or text (.txt) document.');
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds the 10MB limit.');
      event.target.value = '';
      return;
    }

    try {
      setIsParsingJd(true);
      setFormError(null);
      setJdParseSuccess(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/jobs/parse-jd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const parsed = res.data;
      const isPlatinumAuto = 
        (parsed.description?.length || 0) > 250 || 
        (parsed.requirements?.length || 0) > 250;

      setEditingJob((prev: any) => ({
        ...prev,
        title: parsed.title || prev?.title || '',
        description: parsed.description || prev?.description || '',
        requirements: parsed.requirements || prev?.requirements || '',
        location: parsed.location || prev?.location || '',
        minSalary: parsed.minSalary ?? prev?.minSalary ?? 0,
        maxSalary: parsed.maxSalary ?? prev?.maxSalary ?? 0,
        jobType: parsed.jobType || prev?.jobType || 'FullTime',
        workMode: parsed.workMode || prev?.workMode || 'OnSite',
        boardAffiliation: parsed.boardAffiliation || prev?.boardAffiliation || '',
        subjectDepartment: parsed.subjectDepartment || prev?.subjectDepartment || '',
        keywords: parsed.keywords || prev?.keywords || '',
        isPlatinum: isPlatinumAuto ? true : Boolean(prev?.isPlatinum),
        screeningQuestionsJson: parsed.suggestedScreeningQuestions?.length
          ? JSON.stringify(parsed.suggestedScreeningQuestions)
          : prev?.screeningQuestionsJson
      }));

      setParsedJdInfo(parsed);
      setJdParseSuccess(
        `Job details parsed and auto-filled from "${file.name}"!` + 
        (isPlatinumAuto ? ' (Platinum mode auto-enabled for detailed descriptions exceeding 250 characters)' : '')
      );
    } catch (err: any) {
      console.error('Failed to parse JD file', err);
      const errMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : 'Failed to parse Job Description document.');
      setFormError(errMsg);
    } finally {
      setIsParsingJd(false);
      event.target.value = '';
    }
  };

  const openJobModal = (job?: Job) => {
    setFormError(null);
    setParsedJdInfo(null);
    setJdParseSuccess(null);
    if (job) {
      setEditingJob(job);
    } else {
      setEditingJob({ title: '', description: '', requirements: '', location: '', minSalary: 0, maxSalary: 0, jobType: 'FullTime', keywords: '', companyName: '', isPlatinum: false });
    }
    setIsJobModalOpen(true);
  };

  const saveJob = async () => {
    try {
      if (editingJob?.id) {
        await api.put(`/jobs/${editingJob.id}`, editingJob);
      } else {
        await api.post('/jobs', editingJob);
      }
      setIsJobModalOpen(false);
      fetchJobs();
      fetchCredits(); // update balance
      setActiveView('jobs');
    } catch (err: any) {
      console.error('Failed to save job', err);
      if (err.response && err.response.data) {
        setFormError(typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
      } else {
        setFormError(err.message || 'An unknown error occurred');
      }
    }
  };

  const closeJob = async (id: string) => {
    try {
      await api.patch(`/jobs/${id}/close`);
      fetchJobs();
    } catch (err) {
      console.error('Failed to close job', err);
    }
  };

  const openApplicantsModal = async (jobId: string) => {
    try {
      const response = await api.get(`/jobapplications/job/${jobId}`);
      const sorted = (response.data || []).sort((a: any, b: any) => (b.aiMatchScore ?? 0) - (a.aiMatchScore ?? 0));
      setCurrentJobApplicants(sorted);
      setSelectedJobId(jobId);
      setIsApplicantsModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch applicants', err);
    }
  };

  const openAiMatchesModal = async (job: Job) => {
    try {
      setSelectedJobForMatches(job);
      setIsAiMatchesModalOpen(true);
      setIsLoadingAiMatches(true);
      const res = await api.get(`/jobs/${job.id}/matched-candidates`);
      const sorted = (res.data || []).sort((a: any, b: any) => (b.aiRecommendationScore ?? 0) - (a.aiRecommendationScore ?? 0));
      setAiMatchedCandidates(sorted);
    } catch (err) {
      console.error('Failed to fetch AI matched candidates', err);
      setAiMatchedCandidates([]);
    } finally {
      setIsLoadingAiMatches(false);
    }
  };

  const updateApplicationStatus = async (appId: string, status: string) => {
    try {
      await api.patch(`/jobapplications/${appId}/status`, { status });
      if (selectedJobId && isApplicantsModalOpen) {
        openApplicantsModal(selectedJobId);
      }
      fetchInterviews();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const openScheduleModal = (appId: string) => {
    setSelectedApplicationId(appId);
    setInterviewDate('');
    setInterviewMode('Online');
    setInterviewLink('');
    setInterviewVenue('');
    setInterviewDetails('');
    setIsScheduleModalOpen(true);
  };

  const scheduleInterview = async () => {
    if (!selectedApplicationId || !interviewDate) return;
    try {
      await api.patch(`/jobapplications/${selectedApplicationId}/schedule-interview`, {
        interviewDate: new Date(interviewDate).toISOString(),
        interviewMode,
        interviewLink: interviewMode === 'Online' ? interviewLink : null,
        interviewVenue: interviewMode === 'InPerson' ? interviewVenue : null,
        interviewDetails
      });
      setIsScheduleModalOpen(false);
      if (selectedJobId) {
        openApplicantsModal(selectedJobId);
      }
      fetchInterviews();
    } catch (err) {
      console.error('Failed to schedule interview', err);
    }
  };

  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' as const },
    { text: 'Manage Jobs', icon: <WorkIcon />, view: 'jobs' as const },
    { text: 'Interviews', icon: <EventIcon />, view: 'interviews' as const },
    { text: 'Resdex (Search)', icon: <SearchIcon />, view: 'resdex' as const },
    { text: 'Credits', icon: <DescriptionIcon />, view: 'credits' as const },
  ];

  const now = new Date();
  const isInterviewPassed = (app: JobApplication) => {
    if (!app.interviewDate) return false;
    return new Date(app.interviewDate) < now;
  };

  const upcomingInterviews = interviews.filter(app => !isInterviewPassed(app));
  const pendingUpdateInterviews = interviews.filter(app => isInterviewPassed(app));

  const filteredInterviews = interviews.filter(app => {
    if (interviewTabFilter === 'upcoming') return !isInterviewPassed(app);
    if (interviewTabFilter === 'pending') return isInterviewPassed(app);
    return true;
  });

  const renderDashboardOverview = () => (
    <Box>
      {/* Alert if there are interviews that have passed without a decision */}
      {pendingUpdateInterviews.length > 0 && (
        <Alert 
          severity="warning" 
          icon={<PendingActionsIcon />}
          sx={{ mb: 3, borderRadius: 3, border: '1px solid #fde68a', bgcolor: '#fffbeb', alignItems: 'center' }}
          action={
            <Button 
              color="warning" 
              variant="contained" 
              size="small" 
              onClick={() => {
                setInterviewTabFilter('pending');
                setActiveView('interviews');
              }}
              sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
            >
              Update Result{pendingUpdateInterviews.length > 1 ? 's' : ''} ({pendingUpdateInterviews.length})
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#92400e' }}>
            {pendingUpdateInterviews.length} {pendingUpdateInterviews.length === 1 ? 'Interview Requires' : 'Interviews Require'} Result Update
          </Typography>
          <Typography variant="body2" sx={{ color: '#b45309' }}>
            The scheduled interview date has passed. Please mark the candidate as <strong>Offered</strong> or <strong>Rejected</strong>.
          </Typography>
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5, mb: 3 }}>
        {/* Active Jobs */}
        <Box sx={{ width: { xs: '100%', sm: '50%', lg: '25%' }, px: 1.5, mb: { xs: 3, lg: 0 } }}>
          <Card 
            sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
            onClick={() => setActiveView('jobs')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', mr: 2.5 }}>
                <WorkIcon fontSize="large" />
              </Box>
              <Box>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Active Jobs
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {jobs.filter(j => j.isActive).length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Upcoming Interviews (future scheduled interviews only) */}
        <Box sx={{ width: { xs: '100%', sm: '50%', lg: '25%' }, px: 1.5, mb: { xs: 3, lg: 0 } }}>
          <Card 
            sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
            onClick={() => {
              setInterviewTabFilter('upcoming');
              setActiveView('interviews');
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'info.light', color: 'info.main', mr: 2.5 }}>
                <EventIcon fontSize="large" />
              </Box>
              <Box>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Upcoming Interviews
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {upcomingInterviews.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Pending Update (interview date passed, result not yet updated) */}
        <Box sx={{ width: { xs: '100%', sm: '50%', lg: '25%' }, px: 1.5, mb: { xs: 3, lg: 0 } }}>
          <Card 
            sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', 
              cursor: 'pointer',
              border: pendingUpdateInterviews.length > 0 ? '1px solid #f59e0b' : '1px solid #e2e8f0',
              bgcolor: pendingUpdateInterviews.length > 0 ? '#fffdfa' : '#ffffff',
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-2px)' } 
            }}
            onClick={() => {
              setInterviewTabFilter('pending');
              setActiveView('interviews');
            }}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.main', mr: 2.5 }}>
                <PendingActionsIcon fontSize="large" />
              </Box>
              <Box>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Pending Update
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: pendingUpdateInterviews.length > 0 ? 'warning.dark' : 'inherit' }}>
                    {pendingUpdateInterviews.length}
                  </Typography>
                  {pendingUpdateInterviews.length > 0 && (
                    <Chip size="small" label="Action needed" color="warning" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Total Jobs Posted */}
        <Box sx={{ width: { xs: '100%', sm: '50%', lg: '25%' }, px: 1.5 }}>
          <Card 
            sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
            onClick={() => setActiveView('jobs')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'success.main', mr: 2.5 }}>
                <DescriptionIcon fontSize="large" />
              </Box>
              <Box>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Total Jobs Posted
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {jobs.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Recent Jobs quick list */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Recent Job Postings</Typography>
          <Button variant="text" onClick={() => setActiveView('jobs')}>View All</Button>
        </Box>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Job Title</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.slice(0, 3).map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 500 }} color="primary">{job.title}</Typography>
                      <Typography variant="caption" color="textSecondary">{jobTypeMap[job.jobType]}</Typography>
                    </TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>
                      <Chip label={job.isActive ? 'Active' : 'Closed'} color={job.isActive ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        size="small" 
                        variant="contained" 
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={() => openAiMatchesModal(job)} 
                        sx={{ 
                          mr: 1, 
                          borderRadius: 2, 
                          textTransform: 'none', 
                          fontWeight: 600,
                          fontSize: '0.72rem',
                          bgcolor: '#4f46e5',
                          '&:hover': { bgcolor: '#4338ca' }
                        }}
                      >
                        AI Matches
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => openApplicantsModal(job.id)} sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.72rem' }}>
                        Responses
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      No jobs posted yet. <Button variant="text" onClick={() => openJobModal()}>Post a Job</Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );

  const renderJobsView = () => (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
      <TableContainer>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Job ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Job Profile</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Salary Range</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', py: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} hover>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 0.5, borderRadius: 1 }}>
                    {job.id.split('-')[0]}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      src={getMediaUrl(job.institutionLogoUrl)}
                      variant="rounded"
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        p: 0.4,
                        flexShrink: 0,
                        '& img': { objectFit: 'contain' }
                      }}
                    >
                      <SchoolIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 'bold' }} color="primary">
                        {job.title}
                        {job.isPlatinum && <Chip size="small" label="Platinum" color="secondary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {jobTypeMap[job.jobType]} {job.companyName ? `• ${job.companyName}` : ''}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{job.location}</TableCell>
                <TableCell>
                   <Typography variant="body2">
                    ₹{job.minSalary.toLocaleString()} - ₹{job.maxSalary.toLocaleString()}
                   </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={job.isActive ? 'Active' : 'Closed'} 
                    color={job.isActive ? 'success' : 'default'} 
                    size="small" 
                    sx={{ fontWeight: 'bold' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button 
                    variant="contained"
                    size="small" 
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: '13px !important' }} />} 
                    onClick={() => openAiMatchesModal(job)} 
                    sx={{ 
                      mr: 1, 
                      borderRadius: 2, 
                      textTransform: 'none', 
                      fontWeight: 600,
                      bgcolor: '#4f46e5',
                      '&:hover': { bgcolor: '#4338ca' }
                    }}
                  >
                    AI Matches
                  </Button>
                  <Button 
                    variant="outlined"
                    size="small" 
                    startIcon={<GroupIcon />} 
                    onClick={() => openApplicantsModal(job.id)} 
                    sx={{ mr: 1, borderRadius: 2, textTransform: 'none' }}
                  >
                    Responses
                  </Button>
                  <Tooltip title="Edit Job">
                    <span>
                      <IconButton size="small" onClick={() => openJobModal(job)} color="primary" disabled={!job.isActive}>
                        <EditIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Close Job">
                    <span>
                      <IconButton size="small" onClick={() => closeJob(job.id)} color="error" disabled={!job.isActive}>
                        <BlockIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>No jobs found</Typography>
                  <Button variant="contained" onClick={() => openJobModal()} startIcon={<AddIcon/>}>Post your first job</Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderInterviewsView = () => (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
      {/* Filter Tabs */}
      <Box sx={{ p: 2.5, bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={`All (${interviews.length})`} 
            color={interviewTabFilter === 'all' ? 'primary' : 'default'} 
            variant={interviewTabFilter === 'all' ? 'filled' : 'outlined'}
            onClick={() => setInterviewTabFilter('all')}
            clickable
            sx={{ fontWeight: 600 }}
          />
          <Chip 
            label={`Upcoming (${upcomingInterviews.length})`} 
            color={interviewTabFilter === 'upcoming' ? 'info' : 'default'} 
            variant={interviewTabFilter === 'upcoming' ? 'filled' : 'outlined'}
            onClick={() => setInterviewTabFilter('upcoming')}
            clickable
            sx={{ fontWeight: 600 }}
          />
          <Chip 
            icon={<PendingActionsIcon fontSize="small" />}
            label={`Pending Update (${pendingUpdateInterviews.length})`} 
            color={interviewTabFilter === 'pending' ? 'warning' : pendingUpdateInterviews.length > 0 ? 'warning' : 'default'} 
            variant={interviewTabFilter === 'pending' ? 'filled' : 'outlined'}
            onClick={() => setInterviewTabFilter('pending')}
            clickable
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        {pendingUpdateInterviews.length > 0 && (
          <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600 }}>
            {pendingUpdateInterviews.length} completed interview{pendingUpdateInterviews.length > 1 ? 's' : ''} awaiting result
          </Typography>
        )}
      </Box>

      <TableContainer>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Candidate</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Job Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Mode & Venue / Link</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Notes / Details</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', py: 2 }}>Decisions (Result)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInterviews.map((app) => {
              const mode = app.interviewMode === 1 || app.interviewMode === 'InPerson' ? 'InPerson'
                         : app.interviewMode === 2 || app.interviewMode === 'Telephonic' ? 'Telephonic'
                         : 'Online';
              const passed = isInterviewPassed(app);

              return (
                <TableRow key={app.id} hover sx={{ bgcolor: passed ? '#fffdf7' : 'inherit' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: passed ? 'warning.main' : 'secondary.main' }}>
                        {app.candidateName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{app.candidateName}</Typography>
                        <Typography variant="caption" color="textSecondary">{app.candidateEmail}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{app.jobTitle}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: passed ? 'warning.dark' : 'primary.main' }}>
                      {formatDateTime(app.interviewDate, 'Not Set')}
                    </Typography>
                    {passed && (
                      <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, display: 'block' }}>
                        Date Passed
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {passed ? (
                      <Tooltip title="Interview date has passed. Please update the result by making an offer or rejecting.">
                        <Chip label="Pending Update" color="warning" size="small" sx={{ fontWeight: 700 }} />
                      </Tooltip>
                    ) : (
                      <Chip label="Upcoming" color="primary" variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {mode === 'Online' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Chip size="small" label="Online" color="primary" variant="outlined" />
                            {app.interviewLink && (
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<VideocamIcon sx={{ fontSize: '15px !important' }} />}
                                onClick={() => setActiveMeetingApp(app)}
                                sx={{
                                  textTransform: 'none',
                                  py: 0.3,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  borderRadius: 1.5
                                }}
                              >
                                Take Call in EduKey360
                              </Button>
                            )}
                          </Box>
                          {app.interviewLink ? (
                            <Button
                              variant="text"
                              size="small"
                              href={app.interviewLink}
                              target="_blank"
                              rel="noreferrer"
                              startIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                              sx={{
                                p: 0,
                                minWidth: 'auto',
                                textTransform: 'none',
                                fontSize: '0.72rem',
                                color: 'text.secondary',
                                justifyContent: 'flex-start',
                                '&:hover': { color: 'primary.main', bgcolor: 'transparent' }
                              }}
                            >
                              Open in Zoom App
                            </Button>
                          ) : (
                            <Typography variant="caption" color="textSecondary">No link provided</Typography>
                          )}
                        </Box>
                      )}
                      {mode === 'InPerson' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip size="small" label="In-Person" color="success" variant="outlined" />
                          <Typography variant="caption" sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={app.interviewVenue || 'Venue not specified'}>
                            {app.interviewVenue || 'At Campus'}
                          </Typography>
                        </Box>
                      )}
                      {mode === 'Telephonic' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip size="small" label="Telephonic" color="warning" variant="outlined" />
                          <Typography variant="caption" color="textSecondary">
                            {app.interviewDetails || 'Phone Call'}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ mt: 0.5 }}>
                        <Tooltip title="Download .ICS Calendar Invite">
                          <Button 
                            size="small" 
                            variant="outlined"
                            startIcon={<CalendarMonthIcon fontSize="small" />}
                            onClick={() => downloadCalendarInvite(app.id, `interview_${app.candidateName ? app.candidateName.replace(/[^a-zA-Z0-9]/g, '_') : app.id.substring(0, 8)}.ics`)}
                            sx={{ fontSize: '0.72rem', py: 0.2, px: 1, textTransform: 'none', borderRadius: 1.5, cursor: 'pointer' }}
                          >
                            Calendar .ics
                          </Button>
                        </Tooltip>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="textSecondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 200 }}>
                      {app.interviewDetails || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Tooltip title="Offer Job">
                        <Button 
                          variant="contained" 
                          color="success" 
                          size="small" 
                          startIcon={<CheckCircleIcon />} 
                          onClick={() => updateApplicationStatus(app.id, 'Offered')}
                          sx={{ textTransform: 'none', fontWeight: 600, minWidth: 80, borderRadius: 2 }}
                        >
                          Offer
                        </Button>
                      </Tooltip>
                      <Tooltip title="Reject Application">
                        <Button 
                          variant="outlined" 
                          color="error" 
                          size="small" 
                          startIcon={<CancelIcon />} 
                          onClick={() => updateApplicationStatus(app.id, 'Rejected')}
                          sx={{ textTransform: 'none', fontWeight: 600, minWidth: 80, borderRadius: 2 }}
                        >
                          Reject
                        </Button>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInterviews.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="textSecondary">
                    {interviewTabFilter === 'pending' 
                      ? 'No interviews currently pending result update.' 
                      : interviewTabFilter === 'upcoming' 
                        ? 'No upcoming interviews scheduled.' 
                        : 'No scheduled interviews at the moment.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderResdexView = () => (
    <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', py: { xs: 3, md: 4 }, px: { xs: 1.5, sm: 2, md: 2.5 } }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <SearchIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" color="textPrimary" gutterBottom sx={{ fontWeight: 'bold' }}>Candidate Search (Resdex)</Typography>
        <Typography color="textSecondary" sx={{ mb: 4 }}>
          Access our database to find your perfect candidate.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, maxWidth: 900, mx: 'auto' }}>
          <TextField 
            sx={{ flex: '1 1 220px', bgcolor: '#fff', borderRadius: 1 }}
            placeholder="Skills, Subjects, Names, etc." 
            variant="outlined" 
            value={resdexQuery}
            onChange={(e) => setResdexQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResdexSearch()}
          />
          <TextField 
            sx={{ flex: '1 1 150px', bgcolor: '#fff', borderRadius: 1 }}
            placeholder="Location" 
            variant="outlined" 
            value={resdexLocation}
            onChange={(e) => setResdexLocation(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResdexSearch()}
          />
          <FormControl sx={{ minWidth: 110, bgcolor: '#fff', borderRadius: 1 }}>
            <InputLabel>Gender</InputLabel>
            <Select value={resdexGender} onChange={e => setResdexGender(e.target.value)} label="Gender">
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="0">Male</MenuItem>
              <MenuItem value="1">Female</MenuItem>
              <MenuItem value="2">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 140, bgcolor: '#fff', borderRadius: 1 }}>
            <InputLabel>Notice Period</InputLabel>
            <Select value={resdexNoticePeriod} onChange={e => setResdexNoticePeriod(e.target.value)} label="Notice Period">
              <MenuItem value="">Any Notice</MenuItem>
              <MenuItem value="Immediate">Immediate</MenuItem>
              <MenuItem value="15 Days">15 Days</MenuItem>
              <MenuItem value="30 Days">30 Days</MenuItem>
              <MenuItem value="60 Days">60 Days</MenuItem>
              <MenuItem value="90 Days">90 Days</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120, bgcolor: '#fff', borderRadius: 1 }}>
            <InputLabel>CTET Status</InputLabel>
            <Select value={resdexCtet} onChange={e => setResdexCtet(e.target.value)} label="CTET Status">
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="true">Qualified</MenuItem>
              <MenuItem value="false">Not Qualified</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 155, bgcolor: '#fff', borderRadius: 1 }}>
            <InputLabel>Last Updated</InputLabel>
            <Select value={resdexLastUpdated} onChange={e => setResdexLastUpdated(e.target.value)} label="Last Updated">
              <MenuItem value="">Any Time</MenuItem>
              <MenuItem value="1">Last 1 Day (24h)</MenuItem>
              <MenuItem value="7">Last 1 Week</MenuItem>
              <MenuItem value="15">Last 15 Days</MenuItem>
              <MenuItem value="30">Last 1 Month</MenuItem>
              <MenuItem value="90">Last 3 Months</MenuItem>
              <MenuItem value="180">Last 6 Months</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 165, bgcolor: '#fff', borderRadius: 1 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={resdexSortBy} onChange={e => setResdexSortBy(e.target.value as any)} label="Sort By">
              <MenuItem value="aiMatch">🤖 AI Match (Best Fit)</MenuItem>
              <MenuItem value="lastUpdated">🕒 Recently Active</MenuItem>
              <MenuItem value="experience">🎓 Experience (High to Low)</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={resdexVerifiedDemo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResdexVerifiedDemo(e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#166534', whiteSpace: 'nowrap' }}>
                ✓ Verified Demo Only
              </Typography>
            }
            sx={{ ml: 0.5, bgcolor: '#f0fdf4', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #bbf7d0' }}
          />
          <Button 
            variant="contained" 
            size="large" 
            sx={{ px: 4, borderRadius: 2 }}
            onClick={handleResdexSearch}
            disabled={isSearchingResdex}
          >
            {isSearchingResdex ? 'Searching...' : 'Search'}
          </Button>
        </Box>
      </Box>

      {resdexResults.length > 0 ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflowX: 'hidden' }}>
          <Table size="small" sx={{ width: '100%', tableLayout: 'fixed', '& .MuiTableCell-root': { px: { xs: 0.75, sm: 1 }, py: 1.25 } }}>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '23%', fontSize: '0.82rem' }}>Candidate</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '18%', fontSize: '0.82rem' }}>AI Recommendation</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '10%', fontSize: '0.82rem' }}>Experience</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '15%', fontSize: '0.82rem' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '21%', fontSize: '0.82rem' }}>Skills & Credentials</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: '13%', fontSize: '0.82rem' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resdexResults.map((candidate) => (
                <TableRow key={candidate.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar 
                        src={getMediaUrl(candidate.profilePictureUrl)}
                        sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 34, height: 34, fontSize: '0.8rem', flexShrink: 0 }}
                      >
                        {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.82rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {candidate.firstName} {candidate.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {candidate.email ? candidate.email : '***@***.***'}
                        </Typography>
                        {candidate.updatedAt && (
                          <Tooltip title={`Profile Updated: ${formatDateTime(candidate.updatedAt)}`}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.25, px: 0.6, py: 0.1, bgcolor: '#f1f5f9', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                              <AccessTimeIcon sx={{ fontSize: 11, color: '#64748b' }} />
                              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                Active: {formatRelativeTime(candidate.updatedAt)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {candidate.aiRecommendationScore !== null && candidate.aiRecommendationScore !== undefined ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        <Tooltip title={candidate.aiRecommendationReason || `AI Compatibility Score: ${Math.round(candidate.aiRecommendationScore)}%`}>
                          <Chip
                            icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: candidate.aiRecommendationScore >= 80 ? '#15803d !important' : candidate.aiRecommendationScore >= 60 ? '#0284c7 !important' : '#64748b !important' }} />}
                            label={`${Math.round(candidate.aiRecommendationScore)}% Match`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              height: 22,
                              fontSize: '0.7rem',
                              width: 'fit-content',
                              bgcolor: candidate.aiRecommendationScore >= 80 
                                ? 'rgba(34, 197, 94, 0.15)' 
                                : candidate.aiRecommendationScore >= 60 
                                  ? 'rgba(2, 132, 199, 0.15)' 
                                  : 'rgba(148, 163, 184, 0.15)',
                              color: candidate.aiRecommendationScore >= 80 
                                ? '#15803d' 
                                : candidate.aiRecommendationScore >= 60 
                                  ? '#0284c7' 
                                  : '#64748b',
                              border: `1px solid ${
                                candidate.aiRecommendationScore >= 80 
                                  ? 'rgba(34, 197, 94, 0.3)' 
                                  : candidate.aiRecommendationScore >= 60 
                                    ? 'rgba(2, 132, 199, 0.3)' 
                                    : 'rgba(148, 163, 184, 0.3)'
                              }`
                            }}
                          />
                        </Tooltip>
                        {candidate.aiRecommendationReason && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.67rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.2
                            }}
                            title={candidate.aiRecommendationReason}
                          >
                            {candidate.aiRecommendationReason}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {candidate.totalExperienceYears} Yrs
                    </Typography>
                    {candidate.noticePeriod && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                        {candidate.noticePeriod} notice
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.25, wordBreak: 'break-word' }}>
                      {candidate.currentLocation || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {candidate.isCtetQualified && (
                        <Chip label="CTET" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                      )}
                      {candidate.demoVideoUrl && candidate.demoVideoStatus === 'Verified' ? (
                        <Tooltip title={candidate.demoVideoSummary ? `Lesson: ${candidate.demoVideoSummary}` : 'AI Verified Teaching Demonstration'}>
                          <Button 
                            variant="contained" 
                            size="small" 
                            href={candidate.demoVideoUrl} 
                            target="_blank" 
                            startIcon={<PlayCircleOutlineIcon sx={{ fontSize: '12px !important' }} />}
                            sx={{ 
                              textTransform: 'none', 
                              bgcolor: '#16a34a', color: '#fff',
                              '&:hover': { bgcolor: '#15803d' },
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              py: 0.1, px: 0.6,
                              height: 20,
                              minHeight: 20,
                              borderRadius: 1
                            }}
                          >
                            Demo {candidate.demoVideoSubject ? `(${candidate.demoVideoSubject})` : ''}
                          </Button>
                        </Tooltip>
                      ) : candidate.demoVideoUrl && candidate.demoVideoStatus !== 'Rejected' ? (
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small" 
                          href={candidate.demoVideoUrl} 
                          target="_blank" 
                          startIcon={<PlayCircleOutlineIcon sx={{ fontSize: '12px !important' }} />}
                          sx={{ textTransform: 'none', fontSize: '0.65rem', py: 0.1, px: 0.6, height: 20, minHeight: 20, borderRadius: 1 }}
                        >
                          Demo
                        </Button>
                      ) : null}
                      {candidate.joiningAvailability && (
                        <Chip label={candidate.joiningAvailability} size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                      {candidate.skills && (
                        <Tooltip title={candidate.skills}>
                          <Chip label="Skills" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Tooltip>
                      )}
                      {candidate.classesTaught && (
                        <Tooltip title={`Classes: ${candidate.classesTaught}`}>
                          <Chip label="Classes" size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Tooltip>
                      )}
                      {candidate.boardsTaught && (
                        <Tooltip title={`Boards: ${candidate.boardsTaught}`}>
                          <Chip label="Boards" size="small" variant="outlined" color="secondary" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </Tooltip>
                      )}
                      {!candidate.skills && !candidate.classesTaught && !candidate.boardsTaught && !candidate.isCtetQualified && (
                        <Typography variant="caption" color="textSecondary">N/A</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {candidate.hasUnlockedContact ? (
                      <Box sx={{ textAlign: 'left', mb: 0.75, p: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={candidate.email}>{candidate.email}</Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'textSecondary', fontSize: '0.68rem' }}>{candidate.phoneNumber}</Typography>
                      </Box>
                    ) : (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleUnlockContact(candidate.id)}
                        sx={{ mb: 0.5, display: 'block', width: '100%', py: 0.25, px: 0.5, fontSize: '0.68rem', textTransform: 'none', fontWeight: 600, minHeight: 24 }}
                      >
                        Unlock Contact
                      </Button>
                    )}
                    <Button 
                      variant="outlined" 
                      color={candidate.hasDownloadedResume ? "success" : "secondary"}
                      size="small" 
                      startIcon={<DescriptionIcon sx={{ fontSize: '12px !important' }} />}
                      onClick={() => handleDownloadResume(candidate)}
                      sx={{ width: '100%', py: 0.25, px: 0.5, fontSize: '0.68rem', textTransform: 'none', fontWeight: 600, minHeight: 24 }}
                    >
                      {candidate.hasDownloadedResume ? "View Resume" : "Unlock Resume"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        isSearchingResdex ? null : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              No candidates found. Try searching with different keywords.
            </Typography>
          </Box>
        )
      )}
    </Paper>
  );

  const renderCreditsView = () => (
    <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', py: 4, px: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Credit Balance</Typography>
          <Typography color="textSecondary">Your current available credits for premium features.</Typography>
        </Box>
        <Box sx={{ bgcolor: 'primary.light', color: '#ffffff', p: 3, borderRadius: 3, textAlign: 'center', minWidth: 150 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#ffffff' }}>{creditBalance}</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#ffffff' }}>Credits</Typography>
        </Box>
      </Box>



      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Transaction History</Typography>
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {creditHistory.map((tx) => (
              <TableRow key={tx.id} hover>
                <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell>
                  <Chip label={tx.transactionType} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  {(() => {
                    const isDebit = tx.balanceAfter < tx.balanceBefore;
                    const amount = Math.abs(Number(tx.credits));
                    return (
                      <Typography sx={{ fontWeight: 'bold', color: isDebit ? 'error.main' : 'success.main' }}>
                        {isDebit ? '-' : '+'}{amount}
                      </Typography>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
            {creditHistory.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No transactions found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -2 }}>
        
        {/* Sidebar Navigation */}
        <Box sx={{ width: { xs: '100%', md: '20%', lg: '18%' }, px: 1.5, mb: { xs: 4, md: 0 } }}>
          <Paper elevation={0} sx={{ py: 2, px: 1, borderRadius: 3, border: '1px solid #e0e0e0', position: 'sticky', top: 20 }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <WorkIcon fontSize="small" />
              </Avatar>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
                Recruiter Zone
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <List disablePadding>
              {navItems.map((item) => (
                <ListItem 
                  component="div"
                  key={item.text} 
                  onClick={() => {
                    if (item.view === 'interviews') setInterviewTabFilter('all');
                    setActiveView(item.view);
                  }}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: activeView === item.view ? 'primary.light' : 'transparent',
                    color: activeView === item.view ? '#ffffff' : 'text.primary',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: activeView === item.view ? 'primary.light' : 'action.hover',
                    },
                    '& .MuiListItemIcon-root': {
                      color: activeView === item.view ? '#ffffff' : 'text.secondary',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: activeView === item.view ? '#ffffff' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ 
                          fontWeight: activeView === item.view ? 600 : 500, 
                          fontSize: '0.9rem',
                          color: activeView === item.view ? '#ffffff' : 'inherit'
                        }}>
                          {item.text}
                        </Typography>
                        {item.view === 'interviews' && pendingUpdateInterviews.length > 0 && (
                          <Chip 
                            label={`${pendingUpdateInterviews.length} pending`} 
                            size="small" 
                            color="warning" 
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 'bold' }} 
                          />
                        )}
                      </Box>
                    } 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ width: { xs: '100%', md: '80%', lg: '82%' }, px: 1.5 }}>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {activeView === 'dashboard' && 'Dashboard Overview'}
              {activeView === 'jobs' && 'Manage Jobs & Responses'}
              {activeView === 'interviews' && 'Scheduled Interviews'}
              {activeView === 'resdex' && 'Resdex Search'}
              {activeView === 'credits' && 'Credit Management'}
            </Typography>
            <Box>
               <Button 
                 variant="contained" 
                 size="large"
                 startIcon={<AddIcon />} 
                 onClick={() => openJobModal()}
                 sx={{ borderRadius: 2, px: 3, boxShadow: 2 }}
               >
                 Post a Job
               </Button>
            </Box>
          </Box>

          {activeView === 'dashboard' && renderDashboardOverview()}
          {activeView === 'jobs' && renderJobsView()}
          {activeView === 'interviews' && renderInterviewsView()}
          {activeView === 'resdex' && renderResdexView()}
          {activeView === 'credits' && renderCreditsView()}
          
        </Box>
      </Box>

      {/* --- Modals --- */}
      
      {/* Job Create/Edit Modal */}
      <Dialog open={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editingJob?.id ? 'Edit Job Posting' : 'Post a New Job'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            {/* AI Job Description Auto-Fill Dropzone/Uploader */}
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2.5, 
                borderRadius: 2.5, 
                bgcolor: '#f0fdf4', 
                border: '1.5px dashed #86efac'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#16a34a', width: 38, height: 38 }}>
                    <AutoAwesomeIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#15803d' }}>
                      Auto-Fill with AI from Job Description (JD)
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                      Upload PDF, Word (.docx, .doc), or text (.txt) file up to 10MB
                    </Typography>
                  </Box>
                </Box>
                <Button
                  component="label"
                  variant="contained"
                  color="success"
                  size="small"
                  disabled={isParsingJd}
                  startIcon={isParsingJd ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    boxShadow: 'none',
                    bgcolor: '#16a34a',
                    '&:hover': { bgcolor: '#15803d' }
                  }}
                >
                  {isParsingJd ? 'Analyzing JD...' : 'Upload JD File'}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleJdFileUpload}
                    hidden
                  />
                </Button>
              </Box>

              {isParsingJd && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5, p: 1.5, bgcolor: '#ffffff', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                  <CircularProgress size={16} sx={{ color: '#16a34a' }} />
                  <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600 }}>
                    Extracting role requirements, board affiliation, salary, and generating screening questions...
                  </Typography>
                </Box>
              )}

              {jdParseSuccess && (
                <Alert severity="success" sx={{ mt: 1.5, borderRadius: 1.5 }} onClose={() => setJdParseSuccess(null)}>
                  {jdParseSuccess}
                </Alert>
              )}

              {parsedJdInfo?.suggestedScreeningQuestions?.length > 0 && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #bbf7d0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                    Suggested Screening Questions:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {parsedJdInfo.suggestedScreeningQuestions.map((q: string, idx: number) => (
                      <Typography component="li" variant="caption" key={idx} sx={{ color: '#1e293b', mb: 0.25 }}>
                        {q}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>

            <TextField label="Job Title" placeholder="e.g. Senior Software Engineer" value={editingJob?.title || ''} onChange={e => setEditingJob({...editingJob, title: e.target.value})} fullWidth />
            <TextField label="Description" value={editingJob?.description || ''} onChange={e => setEditingJob({...editingJob, description: e.target.value})} multiline rows={3} fullWidth helperText={!editingJob?.isPlatinum ? `Max 250 characters. Current: ${editingJob?.description?.length || 0}/250` : ''} error={!editingJob?.isPlatinum && (editingJob?.description?.length || 0) > 250} />
            <TextField label="Requirements" value={editingJob?.requirements || ''} onChange={e => setEditingJob({...editingJob, requirements: e.target.value})} multiline rows={2} fullWidth helperText={!editingJob?.isPlatinum ? `Max 250 characters. Current: ${editingJob?.requirements?.length || 0}/250` : ''} error={!editingJob?.isPlatinum && (editingJob?.requirements?.length || 0) > 250} />
            <TextField label="Location" placeholder="e.g. Bangalore, India" value={editingJob?.location || ''} onChange={e => setEditingJob({...editingJob, location: e.target.value})} fullWidth />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
              <Box sx={{ width: { xs: '100%', sm: '50%' }, px: 1, mb: { xs: 2, sm: 0 } }}>
                <TextField label="Min Salary (Rs.)" type="number" value={editingJob?.minSalary || ''} onChange={e => setEditingJob({...editingJob, minSalary: Number(e.target.value)})} fullWidth />
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '50%' }, px: 1 }}>
                <TextField label="Max Salary (Rs.)" type="number" value={editingJob?.maxSalary || ''} onChange={e => setEditingJob({...editingJob, maxSalary: Number(e.target.value)})} fullWidth />
              </Box>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Job Type</InputLabel>
              <Select value={editingJob?.jobType ?? 'FullTime'} label="Job Type" onChange={e => setEditingJob({...editingJob, jobType: e.target.value as string})}>
                <MenuItem value="FullTime">Full Time</MenuItem>
                <MenuItem value="PartTime">Part Time</MenuItem>
                <MenuItem value="Contract">Contract</MenuItem>
                <MenuItem value="Internship">Internship</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
              <Box sx={{ width: { xs: '100%', sm: '50%' }, px: 1, mb: { xs: 2, sm: 0 } }}>
                <FormControl fullWidth>
                  <InputLabel>Work Mode</InputLabel>
                  <Select 
                    value={editingJob?.workMode || 'OnSite'} 
                    label="Work Mode" 
                    onChange={e => setEditingJob({...editingJob, workMode: e.target.value as string})}
                  >
                    <MenuItem value="OnSite">On-Site / Campus</MenuItem>
                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                    <MenuItem value="Remote">Remote</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ width: { xs: '100%', sm: '50%' }, px: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Board Affiliation</InputLabel>
                  <Select 
                    value={editingJob?.boardAffiliation || ''} 
                    label="Board Affiliation" 
                    onChange={e => setEditingJob({...editingJob, boardAffiliation: e.target.value as string})}
                  >
                    <MenuItem value="">Not Specified</MenuItem>
                    <MenuItem value="CBSE">CBSE</MenuItem>
                    <MenuItem value="ICSE">ICSE / ISC</MenuItem>
                    <MenuItem value="IB">IB (International Baccalaureate)</MenuItem>
                    <MenuItem value="Cambridge">Cambridge / IGCSE</MenuItem>
                    <MenuItem value="StateBoard">State Board</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <TextField 
              label="Subject / Department" 
              placeholder="e.g. Mathematics, Physics, Primary Section" 
              value={editingJob?.subjectDepartment || ''} 
              onChange={e => setEditingJob({...editingJob, subjectDepartment: e.target.value})} 
              fullWidth 
            />
            <TextField 
              label="Keywords & Skills" 
              placeholder="e.g. Mathematics, Calculus, CBSE, TGT, Secondary" 
              value={editingJob?.keywords || ''} 
              onChange={e => setEditingJob({...editingJob, keywords: e.target.value})} 
              fullWidth 
              helperText="Keywords used for Resdex AI candidate matching"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Platinum Job Posting</Typography>
                <Typography variant="body2" color="textSecondary">Removes 250 character limit on description & requirements. Requires 40 credits instead of 20.</Typography>
              </Box>
              <Select 
                size="small" 
                value={editingJob?.isPlatinum ? 'yes' : 'no'} 
                onChange={e => setEditingJob({...editingJob, isPlatinum: e.target.value === 'yes'})} 
                sx={{ width: 100 }}
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
              </Select>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsJobModalOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={saveJob} sx={{ borderRadius: 2 }}>Post Job</Button>
        </DialogActions>
      </Dialog>

      {/* AI Matched Candidates Modal */}
      <Dialog 
        open={isAiMatchesModalOpen} 
        onClose={() => setIsAiMatchesModalOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: 'rgba(79, 70, 229, 0.1)', p: 1, borderRadius: 2, display: 'flex' }}>
              <AutoAwesomeIcon sx={{ color: '#4f46e5', fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                AI Matched Candidates
              </Typography>
              <Typography variant="caption" color="text.secondary">
                for <strong style={{ color: '#1e293b' }}>{selectedJobForMatches?.title}</strong>
                {selectedJobForMatches?.location ? ` • ${selectedJobForMatches.location}` : ''}
                {selectedJobForMatches?.boardAffiliation ? ` • Board: ${selectedJobForMatches.boardAffiliation}` : ''}
                {selectedJobForMatches?.subjectDepartment ? ` • ${selectedJobForMatches.subjectDepartment}` : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: '#4338ca !important' }} />}
              label="Sorted by Match Score (Highest First)" 
              size="small" 
              sx={{ fontWeight: 600, fontSize: '0.72rem', bgcolor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }} 
            />
            <IconButton onClick={() => setIsAiMatchesModalOpen(false)} size="small">
              <CancelIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {isLoadingAiMatches ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={36} sx={{ color: '#4f46e5', mb: 2 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Analyzing candidate profiles and calculating AI match scores...
              </Typography>
            </Box>
          ) : aiMatchedCandidates.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }} color="text.secondary">
                No Matched Candidates Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No candidates in the database currently match the criteria for this job.
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'hidden' }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '23%', py: 1.25, px: { xs: 0.75, sm: 1 }, fontSize: '0.82rem' }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '18%', py: 1.25, px: { xs: 0.75, sm: 1 }, fontSize: '0.82rem' }}>AI Recommendation</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '10%', py: 1.25, px: { xs: 0.75, sm: 1 }, fontSize: '0.82rem' }}>Experience</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '15%', py: 1.25, px: { xs: 0.75, sm: 1 }, fontSize: '0.82rem' }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '21%', py: 1.25, px: { xs: 0.75, sm: 1 }, fontSize: '0.82rem' }}>Skills & Credentials</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: '13%', py: 1.25, px: { xs: 0.75, sm: 1 }, fontSize: '0.82rem' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiMatchedCandidates.map((candidate) => (
                    <TableRow key={candidate.id} hover>
                      <TableCell sx={{ px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar 
                            src={getMediaUrl(candidate.profilePictureUrl)}
                            sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 34, height: 34, fontSize: '0.8rem', flexShrink: 0 }}
                          >
                            {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.82rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {candidate.firstName} {candidate.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {candidate.email ? candidate.email : '***@***.***'}
                            </Typography>
                            {candidate.updatedAt && (
                              <Tooltip title={`Profile Updated: ${formatDateTime(candidate.updatedAt)}`}>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.25, px: 0.6, py: 0.1, bgcolor: '#f1f5f9', borderRadius: 1, border: '1px solid #e2e8f0' }}>
                                  <AccessTimeIcon sx={{ fontSize: 11, color: '#64748b' }} />
                                  <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                    Active: {formatRelativeTime(candidate.updatedAt)}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
                        {candidate.aiRecommendationScore !== null && candidate.aiRecommendationScore !== undefined ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            <Tooltip title={candidate.aiRecommendationReason || `AI Compatibility Score: ${Math.round(candidate.aiRecommendationScore)}%`}>
                              <Chip
                                icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: candidate.aiRecommendationScore >= 80 ? '#15803d !important' : candidate.aiRecommendationScore >= 60 ? '#0284c7 !important' : '#64748b !important' }} />}
                                label={`${Math.round(candidate.aiRecommendationScore)}% Match`}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  height: 22,
                                  fontSize: '0.7rem',
                                  width: 'fit-content',
                                  bgcolor: candidate.aiRecommendationScore >= 80 
                                    ? 'rgba(34, 197, 94, 0.15)' 
                                    : candidate.aiRecommendationScore >= 60 
                                      ? 'rgba(2, 132, 199, 0.15)' 
                                      : 'rgba(148, 163, 184, 0.15)',
                                  color: candidate.aiRecommendationScore >= 80 
                                    ? '#15803d' 
                                    : candidate.aiRecommendationScore >= 60 
                                      ? '#0284c7' 
                                      : '#64748b',
                                  border: `1px solid ${
                                    candidate.aiRecommendationScore >= 80 
                                      ? 'rgba(34, 197, 94, 0.3)' 
                                      : candidate.aiRecommendationScore >= 60 
                                        ? 'rgba(2, 132, 199, 0.3)' 
                                        : 'rgba(148, 163, 184, 0.3)'
                                  }`
                                }}
                              />
                            </Tooltip>
                            {candidate.aiRecommendationReason && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.67rem',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: 1.2
                                }}
                                title={candidate.aiRecommendationReason}
                              >
                                {candidate.aiRecommendationReason}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {candidate.totalExperienceYears} Yrs
                        </Typography>
                        {candidate.noticePeriod && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                            {candidate.noticePeriod} notice
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.25, wordBreak: 'break-word' }}>
                          {candidate.currentLocation || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {candidate.isCtetQualified && (
                            <Chip label="CTET" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                          )}
                          {candidate.demoVideoUrl && candidate.demoVideoStatus === 'Verified' ? (
                            <Tooltip title={candidate.demoVideoSummary ? `Lesson: ${candidate.demoVideoSummary}` : 'AI Verified Teaching Demonstration'}>
                              <Button 
                                variant="contained" 
                                size="small" 
                                href={candidate.demoVideoUrl} 
                                target="_blank" 
                                startIcon={<PlayCircleOutlineIcon sx={{ fontSize: '12px !important' }} />}
                                sx={{ 
                                  textTransform: 'none', 
                                  bgcolor: '#16a34a', color: '#fff',
                                  '&:hover': { bgcolor: '#15803d' },
                                  fontWeight: 600,
                                  fontSize: '0.65rem',
                                  py: 0.1, px: 0.6,
                                  height: 20,
                                  minHeight: 20,
                                  borderRadius: 1
                                }}
                              >
                                Demo {candidate.demoVideoSubject ? `(${candidate.demoVideoSubject})` : ''}
                              </Button>
                            </Tooltip>
                          ) : candidate.demoVideoUrl && candidate.demoVideoStatus !== 'Rejected' ? (
                            <Button 
                              variant="outlined" 
                              color="primary" 
                              size="small" 
                              href={candidate.demoVideoUrl} 
                              target="_blank" 
                              startIcon={<PlayCircleOutlineIcon sx={{ fontSize: '12px !important' }} />}
                              sx={{ textTransform: 'none', fontSize: '0.65rem', py: 0.1, px: 0.6, height: 20, minHeight: 20, borderRadius: 1 }}
                            >
                              Demo
                            </Button>
                          ) : null}
                          {candidate.joiningAvailability && (
                            <Chip label={candidate.joiningAvailability} size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                          )}
                          {candidate.skills && (
                            <Tooltip title={candidate.skills}>
                              <Chip label="Skills" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </Tooltip>
                          )}
                          {candidate.classesTaught && (
                            <Tooltip title={`Classes: ${candidate.classesTaught}`}>
                              <Chip label="Classes" size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </Tooltip>
                          )}
                          {candidate.boardsTaught && (
                            <Tooltip title={`Boards: ${candidate.boardsTaught}`}>
                              <Chip label="Boards" size="small" variant="outlined" color="secondary" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </Tooltip>
                          )}
                          {!candidate.skills && !candidate.classesTaught && !candidate.boardsTaught && !candidate.isCtetQualified && (
                            <Typography variant="caption" color="textSecondary">N/A</Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ px: { xs: 0.75, sm: 1 }, py: 1.25 }}>
                        {candidate.hasUnlockedContact ? (
                          <Box sx={{ textAlign: 'left', mb: 0.75, p: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', fontSize: '0.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={candidate.email}>{candidate.email}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: 'textSecondary', fontSize: '0.68rem' }}>{candidate.phoneNumber}</Typography>
                          </Box>
                        ) : (
                          <Button 
                            variant="outlined" 
                            size="small" 
                            onClick={() => handleUnlockContact(candidate.id)}
                            sx={{ mb: 0.5, display: 'block', width: '100%', py: 0.25, px: 0.5, fontSize: '0.68rem', textTransform: 'none', fontWeight: 600, minHeight: 24 }}
                          >
                            Unlock Contact
                          </Button>
                        )}
                        <Button 
                          variant="outlined" 
                          color={candidate.hasDownloadedResume ? "success" : "secondary"}
                          size="small" 
                          startIcon={<DescriptionIcon sx={{ fontSize: '12px !important' }} />}
                          onClick={() => handleDownloadResume(candidate)}
                          sx={{ width: '100%', py: 0.25, px: 0.5, fontSize: '0.68rem', textTransform: 'none', fontWeight: 600, minHeight: 24 }}
                        >
                          {candidate.hasDownloadedResume ? "View Resume" : "Unlock Resume"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            Showing {aiMatchedCandidates.length} candidate{aiMatchedCandidates.length === 1 ? '' : 's'} ranked by AI match score
          </Typography>
          <Button onClick={() => setIsAiMatchesModalOpen(false)} variant="outlined" size="small">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Applicants Modal */}
      <Dialog open={isApplicantsModalOpen} onClose={() => setIsApplicantsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Job Applications</span>
          <Chip 
            icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important', color: '#4338ca !important' }} />}
            label="Sorted by AI Match Score" 
            size="small" 
            sx={{ fontSize: '0.72rem', fontWeight: 600, bgcolor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }} 
          />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Candidate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>AI Match</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentJobApplicants.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar 
                          src={getMediaUrl(app.candidateProfilePictureUrl)}
                          sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}
                        >
                          {app.candidateName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{app.candidateName}</Typography>
                          <Typography variant="caption" color="textSecondary">{app.candidateEmail}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {app.aiMatchScore ? (
                        <Chip 
                          label={`${app.aiMatchScore}%`} 
                          size="small" 
                          color={app.aiMatchScore > 75 ? 'success' : app.aiMatchScore > 50 ? 'warning' : 'default'}
                        />
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {app.status === 'InterviewScheduled' && isInterviewPassed(app) ? (
                        <Tooltip title="Interview date has passed. Please update status to Offered or Rejected.">
                          <Chip label="Pending Update" size="small" color="warning" sx={{ fontWeight: 700 }} />
                        </Tooltip>
                      ) : (
                        <Chip label={statusMap[app.status] || app.status} size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
                        {app.candidateResumeUrl && (
                          <Tooltip title="View Attached Resume">
                            <IconButton 
                              size="small" 
                              color="primary"
                              component="a"
                              href={getMediaUrl(app.candidateResumeUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <PictureAsPdfIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(app.coverLetter || app.screeningAnswersJson) && (
                          <Tooltip title="View Cover Letter & Responses">
                            <IconButton 
                              size="small" 
                              color="info"
                              onClick={() => setViewingApplication(app)}
                            >
                              <ArticleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Select 
                          size="small" 
                          value={app.status} 
                          onChange={(e) => {
                            const val = e.target.value as string;
                            if (val === 'InterviewScheduled') openScheduleModal(app.id);
                            else updateApplicationStatus(app.id, val);
                          }}
                          sx={{ minWidth: 130, borderRadius: 2 }}
                        >
                          {Object.entries(statusMap).map(([key, label]) => (
                            <MenuItem key={key} value={key}>{label}</MenuItem>
                          ))}
                        </Select>
                        <Tooltip title="Evaluation Notes">
                          <IconButton 
                            size="small" 
                            color="default" 
                            onClick={() => openCommentsModal(app.id)}
                          >
                            <CommentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {currentJobApplicants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>No applicants yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsApplicantsModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Application Submission Details Modal (Cover Letter & Screening Answers) */}
      <Dialog open={Boolean(viewingApplication)} onClose={() => setViewingApplication(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ArticleIcon color="primary" />
          Application: {viewingApplication?.candidateName}
        </DialogTitle>
        <DialogContent dividers>
          {viewingApplication?.coverLetter ? (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>
                Cover Letter
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {viewingApplication.coverLetter}
                </Typography>
              </Paper>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2, fontStyle: 'italic' }}>
              No cover letter was submitted with this application.
            </Typography>
          )}

          {viewingApplication?.screeningAnswersJson && (() => {
            try {
              const answers = JSON.parse(viewingApplication.screeningAnswersJson);
              const entries = Object.entries(answers);
              if (entries.length === 0) return null;
              return (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>
                    Screening Question Responses
                  </Typography>
                  {entries.map(([question, answer], idx) => (
                    <Box key={idx} sx={{ mb: 1.5, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        Q{idx + 1}: {question}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {String(answer) || '(No response)'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            } catch {
              return null;
            }
          })()}

          {viewingApplication?.candidateResumeUrl && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                component="a"
                startIcon={<PictureAsPdfIcon />}
                href={getMediaUrl(viewingApplication.candidateResumeUrl) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View Applied Resume
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewingApplication(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Interview Modal */}
      <Dialog open={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Schedule Interview</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Select date, interview mode, and provide the venue or meeting link to invite the candidate. An automated invitation email and calendar invite (.ics) will be dispatched to the candidate.
            </Typography>
            
            <TextField 
              label="Interview Date & Time" 
              type="datetime-local" 
              value={interviewDate} 
              onChange={e => setInterviewDate(e.target.value)} 
              slotProps={{ inputLabel: { shrink: true } }} 
              fullWidth 
              required
            />
            
            <FormControl fullWidth>
              <InputLabel id="interview-mode-label">Interview Mode</InputLabel>
              <Select
                labelId="interview-mode-label"
                value={interviewMode}
                label="Interview Mode"
                onChange={(e) => setInterviewMode(e.target.value as any)}
              >
                <MenuItem value="Online">🌐 Online (Video Conference / Meeting Link)</MenuItem>
                <MenuItem value="InPerson">🏢 In-Person (On-Site Campus / Office)</MenuItem>
                <MenuItem value="Telephonic">📞 Telephonic (Voice Phone Interview)</MenuItem>
              </Select>
            </FormControl>

            {interviewMode === 'Online' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TextField 
                  label="Meeting Link" 
                  placeholder="e.g. https://zoom.us/j/1234567890?pwd=... or Google Meet"
                  value={interviewLink} 
                  onChange={e => setInterviewLink(e.target.value)} 
                  fullWidth 
                  helperText="Paste the Zoom, Google Meet, or Microsoft Teams link"
                />
                {(() => {
                  const zoom = parseZoomMeeting(interviewLink);
                  if (zoom.isZoom) {
                    return (
                      <Alert severity="success" icon={<VideocamIcon fontSize="inherit" />} sx={{ py: 0.25, px: 1.5, fontSize: '0.78rem', alignItems: 'center' }}>
                        <strong>Zoom Meeting Detected:</strong> In-app video calling will be automatically enabled for both you and the candidate.
                        {zoom.meetingId && ` (ID: ${zoom.formattedMeetingId || zoom.meetingId})`}
                      </Alert>
                    );
                  }
                  return null;
                })()}
              </Box>
            )}

            {interviewMode === 'InPerson' && (
              <TextField 
                label="Interview Venue & Address" 
                placeholder="e.g. Main Campus, Building B, Room 204, Sector 62, Noida"
                value={interviewVenue} 
                onChange={e => setInterviewVenue(e.target.value)} 
                fullWidth 
                multiline
                rows={2}
                helperText="Specify the full campus/office address, room number, or reporting desk"
              />
            )}

            {interviewMode === 'Telephonic' && (
              <TextField 
                label="Telephonic Instructions / Dial-in" 
                placeholder="e.g. Recruiter will call candidate's registered number, or Candidate should call +91-9876543210 at scheduled time"
                value={interviewDetails} 
                onChange={e => setInterviewDetails(e.target.value)} 
                fullWidth 
                helperText="Specify contact number or dial-in instructions"
              />
            )}

            {interviewMode !== 'Telephonic' && (
              <TextField 
                label="Additional Instructions & Notes (Optional)" 
                placeholder="e.g. Please bring original certificates, demo lesson plan, and photo ID..."
                value={interviewDetails} 
                onChange={e => setInterviewDetails(e.target.value)} 
                fullWidth 
                multiline
                rows={2}
                helperText="Any preparation guidelines or documents candidate should bring"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsScheduleModalOpen(false)} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            onClick={scheduleInterview} 
            disabled={!interviewDate}
            sx={{ borderRadius: 2 }}
          >
            Confirm & Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Recruiter Evaluation Notes Dialog */}
      <Dialog open={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Evaluation Notes & Comments</DialogTitle>
        <DialogContent dividers>
          {isLoadingComments ? (
            <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>Loading notes...</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <List disablePadding>
                {appComments.map((c) => (
                  <Paper key={c.id} sx={{ p: 2, mb: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.comment}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatDateTime(c.createdAt)}
                    </Typography>
                  </Paper>
                ))}
                {appComments.length === 0 && (
                  <Typography color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
                    No notes for this applicant yet. Add the first evaluation note below.
                  </Typography>
                )}
              </List>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="e.g. Cleared round 1 demo. Strong CBSE knowledge..." 
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && submitComment()}
                />
                <Button variant="contained" endIcon={<SendIcon />} onClick={submitComment}>
                  Add
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCommentsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* In-App Zoom Video Meeting Room */}
      <EmbeddedZoomMeetingDialog
        open={!!activeMeetingApp}
        onClose={() => setActiveMeetingApp(null)}
        interviewLink={activeMeetingApp?.interviewLink}
        jobTitle={activeMeetingApp?.jobTitle}
        candidateName={activeMeetingApp?.candidateName}
        companyName={activeMeetingApp?.companyName}
        interviewDate={activeMeetingApp?.interviewDate}
      />
    </Container>
  );
}
