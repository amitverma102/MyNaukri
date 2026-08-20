import { useState, useEffect } from 'react';
import { 
  Typography, Container, Paper, Box, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, Select, InputLabel, FormControl, IconButton,
  Card, CardContent, List, ListItem, ListItemIcon, ListItemText, Divider, Avatar, Tooltip, Alert
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

import api from '../api/axios';

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
}

interface CreditTransaction {
  id: string;
  amount: number;
  transactionType: string;
  description: string;
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
  interviewLink: string | null;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
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
}

const jobTypeMap: Record<string, string> = {
  'FullTime': 'Full Time',
  'PartTime': 'Part Time',
  'Contract': 'Contract',
  'Internship': 'Internship'
};

export default function RecruiterDashboard() {

  const [activeView, setActiveView] = useState<'dashboard' | 'jobs' | 'interviews' | 'resdex' | 'credits'>('dashboard');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<JobApplication[]>([]);
  
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
  
  // Modals state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<Job> | null>(null);
  
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [currentJobApplicants, setCurrentJobApplicants] = useState<JobApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewLink, setInterviewLink] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Resdex State
  const [resdexQuery, setResdexQuery] = useState('');
  const [resdexLocation, setResdexLocation] = useState('');
  const [resdexGender, setResdexGender] = useState('');
  const [resdexResults, setResdexResults] = useState<Candidate[]>([]);
  const [isSearchingResdex, setIsSearchingResdex] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchInterviews();
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const balRes = await api.get('/credits/balance');
      setCreditBalance(balRes.data.balance);
      const histRes = await api.get('/credits/history');
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
      
      const response = await api.get(url);
      setResdexResults(response.data);
    } catch (err) {
      console.error('Failed to search candidates', err);
      setResdexResults([]);
    } finally {
      setIsSearchingResdex(false);
    }
  };

  const handleUnlockContact = async (candidateId: string) => {
    try {
      if (!window.confirm("This will deduct credits. Continue?")) return;
      const response = await api.post(`/candidates/${candidateId}/contact/unlock`);
      alert(`Contact Unlocked!\nEmail: ${response.data.email}\nPhone: ${response.data.phoneNumber}`);
      fetchCredits(); // update balance
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to unlock contact. Insufficient credits?");
    }
  };

  const handleDownloadResume = async (candidateId: string) => {
    try {
      if (!window.confirm("Downloading resume will deduct credits. Continue?")) return;
      const response = await api.get(`/candidates/${candidateId}/resume/download`);
      window.open(response.data.resumeUrl, '_blank');
      fetchCredits(); // update balance
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to download resume. Insufficient credits?");
    }
  };

  const openJobModal = (job?: Job) => {
    setFormError(null);
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
      setCurrentJobApplicants(response.data);
      setSelectedJobId(jobId);
      setIsApplicantsModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch applicants', err);
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
    setInterviewLink('');
    setIsScheduleModalOpen(true);
  };

  const scheduleInterview = async () => {
    if (!selectedApplicationId) return;
    try {
      await api.patch(`/jobapplications/${selectedApplicationId}/schedule-interview`, {
        interviewDate: new Date(interviewDate).toISOString(),
        interviewLink
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

  const renderDashboardOverview = () => (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5, mb: 3 }}>
        <Box sx={{ width: { xs: '100%', md: '33.33%' }, px: 1.5, mb: { xs: 3, md: 0 } }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', mr: 3 }}>
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
        <Box sx={{ width: { xs: '100%', md: '33.33%' }, px: 1.5, mb: { xs: 3, md: 0 } }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.main', mr: 3 }}>
                <EventIcon fontSize="large" />
              </Box>
              <Box>
                <Typography color="textSecondary" variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Upcoming Interviews
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {interviews.length}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ width: { xs: '100%', md: '33.33%' }, px: 1.5 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'success.main', mr: 3 }}>
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
                      <Button size="small" variant="outlined" onClick={() => openApplicantsModal(job.id)} sx={{ borderRadius: 2 }}>
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
                  <Typography sx={{ fontWeight: 'bold' }} color="primary">
                    {job.title}
                    {job.isPlatinum && <Chip size="small" label="Platinum" color="secondary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {jobTypeMap[job.jobType]}
                  </Typography>
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
                    variant="outlined"
                    size="small" 
                    startIcon={<GroupIcon />} 
                    onClick={() => openApplicantsModal(job.id)} 
                    sx={{ mr: 1, borderRadius: 2 }}
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
      <TableContainer>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Candidate</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Job Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Meeting Link</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', py: 2 }}>Decisions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {interviews.map((app) => (
              <TableRow key={app.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>{app.candidateName.charAt(0)}</Avatar>
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
                  <Typography variant="body2">
                    {app.interviewDate ? new Date(app.interviewDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not Set'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {app.interviewLink ? (
                    <Button variant="text" size="small" href={app.interviewLink} target="_blank" rel="noreferrer">
                      Join Meeting
                    </Button>
                  ) : (
                    <Typography variant="body2" color="textSecondary">N/A</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Make Offer">
                    <IconButton color="success" onClick={() => updateApplicationStatus(app.id, 'Offered')}>
                      <CheckCircleIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton color="error" onClick={() => updateApplicationStatus(app.id, 'Rejected')}>
                      <CancelIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {interviews.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="textSecondary">No scheduled interviews at the moment.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  const renderResdexView = () => (
    <Paper sx={{ borderRadius: 3, boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)', py: 6, px: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <SearchIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" color="textPrimary" gutterBottom sx={{ fontWeight: 'bold' }}>Candidate Search (Resdex)</Typography>
        <Typography color="textSecondary" sx={{ mb: 4 }}>
          Access our database to find your perfect candidate.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, maxWidth: 600, mx: 'auto' }}>
          <TextField 
            fullWidth 
            placeholder="Skills, Subjects, Names, etc." 
            variant="outlined" 
            sx={{ bgcolor: '#fff', borderRadius: 1 }} 
            value={resdexQuery}
            onChange={(e) => setResdexQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResdexSearch()}
          />
          <TextField 
            placeholder="Location" 
            variant="outlined" 
            sx={{ bgcolor: '#fff', borderRadius: 1, width: 200 }} 
            value={resdexLocation}
            onChange={(e) => setResdexLocation(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResdexSearch()}
          />
          <FormControl sx={{ minWidth: 120, bgcolor: '#fff', borderRadius: 1 }}>
            <InputLabel>Gender</InputLabel>
            <Select value={resdexGender} onChange={e => setResdexGender(e.target.value)} label="Gender">
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="0">Male</MenuItem>
              <MenuItem value="1">Female</MenuItem>
              <MenuItem value="2">Other</MenuItem>
            </Select>
          </FormControl>
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
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Candidate</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Experience</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Skills / Teaching</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resdexResults.map((candidate) => (
                <TableRow key={candidate.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                        {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {candidate.firstName} {candidate.lastName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {candidate.email ? candidate.email : '***@***.***'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{candidate.totalExperienceYears} Years</TableCell>
                  <TableCell>{candidate.currentLocation || 'N/A'}</TableCell>
                  <TableCell>
                    {candidate.skills && (
                      <Tooltip title={candidate.skills}>
                        <Chip label="Skills" size="small" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                      </Tooltip>
                    )}
                    {candidate.classesTaught && (
                      <Tooltip title={`Classes: ${candidate.classesTaught}`}>
                        <Chip label="Classes" size="small" variant="outlined" color="primary" sx={{ mr: 1, mb: 1 }} />
                      </Tooltip>
                    )}
                    {candidate.boardsTaught && (
                      <Tooltip title={`Boards: ${candidate.boardsTaught}`}>
                        <Chip label="Boards" size="small" variant="outlined" color="secondary" sx={{ mb: 1 }} />
                      </Tooltip>
                    )}
                    {!candidate.skills && !candidate.classesTaught && !candidate.boardsTaught && 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => handleUnlockContact(candidate.id)}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      Unlock Contact
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="secondary"
                      size="small" 
                      startIcon={<DescriptionIcon />}
                      onClick={() => handleDownloadResume(candidate.id)}
                      sx={{ mb: 1 }}
                    >
                      Resume
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
        <Box sx={{ bgcolor: 'primary.light', color: 'primary.main', p: 3, borderRadius: 3, textAlign: 'center', minWidth: 150 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{creditBalance}</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Credits</Typography>
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
                <TableCell>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString()}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell>
                  <Chip label={tx.transactionType} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Typography sx={{ fontWeight: 'bold', color: tx.amount > 0 ? 'success.main' : 'error.main' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </Typography>
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
        <Box sx={{ width: { xs: '100%', md: '25%', lg: '20%' }, px: 2, mb: { xs: 4, md: 0 } }}>
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
                  onClick={() => setActiveView(item.view)}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: activeView === item.view ? 'primary.light' : 'transparent',
                    color: activeView === item.view ? 'primary.main' : 'text.primary',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: activeView === item.view ? 'primary.light' : 'action.hover',
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: activeView === item.view ? 'primary.main' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={<Typography sx={{ fontWeight: activeView === item.view ? 600 : 500, fontSize: '0.95rem' }}>{item.text}</Typography>} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ width: { xs: '100%', md: '75%', lg: '80%' }, px: 2 }}>
          
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

      {/* Applicants Modal */}
      <Dialog open={isApplicantsModalOpen} onClose={() => setIsApplicantsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Job Applications</DialogTitle>
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
                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>{app.candidateName.charAt(0)}</Avatar>
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
                      <Chip label={statusMap[app.status]} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Select 
                        size="small" 
                        value={app.status} 
                        onChange={(e) => {
                          const val = e.target.value as string;
                          if (val === 'InterviewScheduled') openScheduleModal(app.id);
                          else updateApplicationStatus(app.id, val);
                        }}
                        sx={{ minWidth: 160, borderRadius: 2 }}
                      >
                        {Object.entries(statusMap).map(([key, label]) => (
                          <MenuItem key={key} value={key}>{label}</MenuItem>
                        ))}
                      </Select>
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

      {/* Schedule Interview Modal */}
      <Dialog open={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Schedule Interview</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1, minWidth: 350 }}>
            <Typography variant="body2" color="textSecondary">
              Select a date and provide a meeting link to invite the candidate for an interview.
            </Typography>
            <TextField 
              label="Interview Date & Time" 
              type="datetime-local" 
              value={interviewDate} 
              onChange={e => setInterviewDate(e.target.value)} 
              slotProps={{ inputLabel: { shrink: true } }} 
              fullWidth 
            />
            <TextField 
              label="Meeting Link (Optional)" 
              placeholder="e.g. https://zoom.us/j/..."
              value={interviewLink} 
              onChange={e => setInterviewLink(e.target.value)} 
              fullWidth 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsScheduleModalOpen(false)} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={scheduleInterview} sx={{ borderRadius: 2 }}>Confirm Schedule</Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
}
