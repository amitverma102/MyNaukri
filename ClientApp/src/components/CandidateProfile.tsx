import { useState, useEffect } from 'react';
import { 
  Box, Typography, Container, Paper, TextField, Button, Alert, 
  CircularProgress, Link, Checkbox, FormControlLabel, Divider,
  MenuItem, Select, FormControl, InputLabel, Chip, Avatar,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { 
  OndemandVideo as VideoIcon, 
  VerifiedUser as VerifiedIcon, 
  Security as SecurityIcon, 
  School as SchoolIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  RestartAlt as RefreshIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE_URL, getMediaUrl } from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function CandidateProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [experience, setExperience] = useState<number>(0);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [currentSalary, setCurrentSalary] = useState<number | ''>('');
  const [expectedSalary, setExpectedSalary] = useState<number | ''>('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [classesTaught, setClassesTaught] = useState('');
  const [boardsTaught, setBoardsTaught] = useState('');
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [demoVideoStatus, setDemoVideoStatus] = useState('Unverified');
  const [demoVideoSubject, setDemoVideoSubject] = useState('');
  const [demoVideoSummary, setDemoVideoSummary] = useState('');
  const [demoVideoRejectionReason, setDemoVideoRejectionReason] = useState('');
  const [isVerifyingVideo, setIsVerifyingVideo] = useState(false);
  const [videoActionMsg, setVideoActionMsg] = useState('');
  const [isCtetQualified, setIsCtetQualified] = useState(false);
  const [ctetDetails, setCtetDetails] = useState('');
  const [currentInstitution, setCurrentInstitution] = useState('');
  const [blockedInstitutions, setBlockedInstitutions] = useState('');
  const [joiningAvailability, setJoiningAvailability] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setDeleteError('');
      await api.delete('/auth/account');
      localStorage.clear();
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.response?.data || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  // Fetch existing profile (it might return 404 if not created yet, which is fine)
  const { data: profile } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/candidates/profile');
      return response.data;
    },
    retry: false
  });

  useEffect(() => {
    if (profile) {
      setSummary(profile.summary || profile.Summary || '');
      setSkills(profile.skills || profile.Skills || '');
      setPhoneNumber(profile.phoneNumber || profile.PhoneNumber || '');
      setExperience(profile.totalExperienceYears || profile.TotalExperienceYears || 0);
      setResumeUrl(profile.resumeUrl || profile.ResumeUrl || null);
      const pic = profile.profilePictureUrl || profile.ProfilePictureUrl || null;
      setProfilePictureUrl(pic);
      if (pic) localStorage.setItem('user_picture', pic);
      setCurrentSalary(profile.currentSalary ?? profile.CurrentSalary ?? '');
      setExpectedSalary(profile.expectedSalary ?? profile.ExpectedSalary ?? '');
      setNoticePeriod(profile.noticePeriod || profile.NoticePeriod || '');
      setCurrentLocation(profile.currentLocation || profile.CurrentLocation || '');
      setPreferredLocations(profile.preferredLocations || profile.PreferredLocations || '');
      setClassesTaught(profile.classesTaught || profile.ClassesTaught || '');
      setBoardsTaught(profile.boardsTaught || profile.BoardsTaught || '');
      setEducation(profile.education || profile.Education || '');
      setCertifications(profile.certifications || profile.Certifications || '');
      setDemoVideoUrl(profile.demoVideoUrl || profile.DemoVideoUrl || '');
      setDemoVideoStatus(profile.demoVideoStatus || profile.DemoVideoStatus || 'Unverified');
      setDemoVideoSubject(profile.demoVideoSubject || profile.DemoVideoSubject || '');
      setDemoVideoSummary(profile.demoVideoSummary || profile.DemoVideoSummary || '');
      setDemoVideoRejectionReason(profile.demoVideoRejectionReason || profile.DemoVideoRejectionReason || '');
      setIsCtetQualified(Boolean(profile.isCtetQualified ?? profile.IsCtetQualified));
      setCtetDetails(profile.ctetDetails || profile.CtetDetails || '');
      setCurrentInstitution(profile.currentInstitution || profile.CurrentInstitution || '');
      setBlockedInstitutions(profile.blockedInstitutions || profile.BlockedInstitutions || '');
      setJoiningAvailability(profile.joiningAvailability || profile.JoiningAvailability || '');
    }
  }, [profile]);

  const handleReverifyVideo = async () => {
    try {
      setIsVerifyingVideo(true);
      setVideoActionMsg('');
      await api.post('/candidates/verify-demo-video');
      setDemoVideoStatus('Pending');
      setVideoActionMsg('AI Verification queued. Results will appear shortly.');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err: any) {
      setVideoActionMsg(err.response?.data?.message || 'Failed to queue video verification.');
    } finally {
      setIsVerifyingVideo(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        summary,
        skills,
        phoneNumber,
        totalExperienceYears: Number(experience),
        currentSalary: currentSalary === '' ? null : Number(currentSalary),
        expectedSalary: expectedSalary === '' ? null : Number(expectedSalary),
        noticePeriod,
        currentLocation,
        preferredLocations,
        classesTaught,
        boardsTaught,
        education,
        certifications,
        demoVideoUrl,
        isCtetQualified,
        ctetDetails,
        currentInstitution,
        blockedInstitutions,
        joiningAvailability,
        profilePictureUrl
      };
      await api.post('/candidates/profile', payload);
    },
    onSuccess: () => {
      setSuccessMsg('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendedJobs'] });
      setTimeout(() => navigate('/candidate/dashboard'), 1500);
    }
  });

  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/candidates/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSuccessMsg('Resume uploaded and parsed successfully!');
      const newSkills = data.skills || data.Skills;
      if (newSkills) {
        setSkills(prev => prev ? `${prev}, ${newSkills}` : newSkills);
      }
      const newUrl = data.resumeUrl || data.ResumeUrl;
      if (newUrl) {
        setResumeUrl(newUrl);
      }
      const newPhone = data.phoneNumber || data.PhoneNumber;
      if (newPhone) {
        setPhoneNumber(prev => prev || newPhone);
      }
      const newExp = data.totalExperienceYears ?? data.TotalExperienceYears;
      if (newExp !== undefined && newExp !== null) {
        setExperience(prev => prev || newExp);
      }
      const newLoc = data.currentLocation || data.CurrentLocation;
      if (newLoc) setCurrentLocation(prev => prev || newLoc);
      const newClasses = data.classesTaught || data.ClassesTaught;
      if (newClasses) setClassesTaught(prev => prev || newClasses);
      const newBoards = data.boardsTaught || data.BoardsTaught;
      if (newBoards) setBoardsTaught(prev => prev || newBoards);
      const newEdu = data.education || data.Education;
      if (newEdu) setEducation(prev => prev || newEdu);
      const newCerts = data.certifications || data.Certifications;
      if (newCerts) setCertifications(prev => prev || newCerts);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate();
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/candidates/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: (data) => {
      const newPicUrl = data.profilePictureUrl || data.ProfilePictureUrl;
      setProfilePictureUrl(newPicUrl);
      if (newPicUrl) localStorage.setItem('user_picture', newPicUrl);
      setSuccessMsg('Profile photo updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.response?.data || 'Failed to upload photo.');
    }
  });

  const removePhotoMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/auth/profile-picture');
    },
    onSuccess: () => {
      setProfilePictureUrl(null);
      localStorage.removeItem('user_picture');
      setSuccessMsg('Profile photo removed.');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.response?.data || 'Failed to remove photo.');
    }
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must not exceed 5 MB.');
        return;
      }
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadResumeMutation.mutate(e.target.files[0]);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
          Update Your Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Stand out to top schools, colleges, and EdTech recruiters with a verified educator profile.
        </Typography>

        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        {updateProfileMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to update profile.</Alert>}
        {uploadResumeMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to upload resume.</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Profile Picture Section */}
          <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2, mb: 3, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Avatar
              src={getMediaUrl(profilePictureUrl)}
              sx={{ width: 90, height: 90, border: '3px solid #cbd5e1', bgcolor: 'primary.main', fontSize: '2rem' }}
            >
              {profile?.firstName?.[0] || 'C'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>
                Profile Photo
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Upload a professional photo (JPG, PNG or WebP up to 5 MB). It will be visible to hiring teams when you apply.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={uploadPhotoMutation.isPending ? <CircularProgress size={16} /> : <PhotoCameraIcon />}
                  disabled={uploadPhotoMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handlePhotoUpload}
                  />
                </Button>
                {profilePictureUrl && (
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    disabled={removePhotoMutation.isPending}
                    onClick={() => removePhotoMutation.mutate()}
                    sx={{ textTransform: 'none' }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {/* Resume Upload Section */}
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, mb: 3, border: '1px dashed #cbd5e1' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                component="label"
                disabled={uploadResumeMutation.isPending}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {uploadResumeMutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Upload Resume'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                />
              </Button>
              {resumeUrl && (
                <Typography variant="body2">
                  <Link href={`${API_BASE_URL}${resumeUrl}`} target="_blank" rel="noopener" sx={{ fontWeight: 600 }}>
                    📄 View Current Resume
                  </Link>
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Accepted formats: PDF, DOC, DOCX. Skills and details are automatically parsed.
            </Typography>
          </Box>

          {/* Basic & Contact Info */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WorkIcon fontSize="small" color="primary" /> Professional Overview
          </Typography>

          <TextField
            fullWidth
            label="Professional Summary"
            multiline
            rows={3}
            margin="normal"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Experienced PGT Physics educator with 6+ years preparing students for CBSE boards and JEE mains..."
          />
          <TextField
            fullWidth
            label="Key Skills (Comma separated)"
            margin="normal"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Curriculum Design, Classroom Management, EdTech, Lesson Planning"
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              fullWidth
              label="Phone Number"
              margin="normal"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <TextField
              fullWidth
              label="Total Experience (Years)"
              type="number"
              margin="normal"
              value={experience}
              onChange={(e) => setExperience(Number(e.target.value))}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              fullWidth
              label="Current Salary (₹ / Annual)"
              type="number"
              margin="normal"
              value={currentSalary}
              onChange={(e) => setCurrentSalary(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <TextField
              fullWidth
              label="Expected Salary (₹ / Annual)"
              type="number"
              margin="normal"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              fullWidth
              label="Notice Period"
              margin="normal"
              value={noticePeriod}
              onChange={(e) => setNoticePeriod(e.target.value)}
              placeholder="e.g. 15 Days, 1 Month, Immediate"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="joining-avail-label">Joining Availability</InputLabel>
              <Select
                labelId="joining-avail-label"
                label="Joining Availability"
                value={joiningAvailability}
                onChange={(e) => setJoiningAvailability(e.target.value)}
              >
                <MenuItem value="">Not Specified</MenuItem>
                <MenuItem value="Immediate">Immediate</MenuItem>
                <MenuItem value="15 Days">Within 15 Days</MenuItem>
                <MenuItem value="30 Days">Within 30 Days</MenuItem>
                <MenuItem value="Next Academic Session">Next Academic Session (April/June)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              fullWidth
              label="Current Location"
              margin="normal"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. New Delhi"
            />
            <TextField
              fullWidth
              label="Preferred Locations"
              margin="normal"
              value={preferredLocations}
              onChange={(e) => setPreferredLocations(e.target.value)}
              placeholder="e.g. Noida, Gurgaon, Delhi NCR"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Academic & Pedagogical Credentials */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SchoolIcon fontSize="small" color="primary" /> Teaching & Education Credentials
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <TextField
              fullWidth
              label="Classes / Grades Taught"
              margin="normal"
              value={classesTaught}
              onChange={(e) => setClassesTaught(e.target.value)}
              placeholder="e.g. 9th, 10th, 11th, 12th"
            />
            <TextField
              fullWidth
              label="Boards Taught In"
              margin="normal"
              value={boardsTaught}
              onChange={(e) => setBoardsTaught(e.target.value)}
              placeholder="e.g. CBSE, ICSE, IB, State Board"
            />
          </Box>

          <TextField
            fullWidth
            label="Education / Highest Degrees"
            margin="normal"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="e.g. M.Sc Physics (Delhi University), B.Ed (Jamia Millia Islamia)"
          />
          <TextField
            fullWidth
            label="Certifications & Licensures"
            margin="normal"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            placeholder="e.g. Google Certified Educator Level 2, Cambridge PDQ"
          />

          {/* CTET / STET Verification */}
          <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, mt: 2, border: '1px solid #bbf7d0' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isCtetQualified}
                  onChange={(e) => setIsCtetQualified(e.target.checked)}
                  color="success"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <VerifiedIcon color="success" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                    CTET / State TET Qualified
                  </Typography>
                </Box>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: isCtetQualified ? 1.5 : 0 }}>
              Check this if you have cleared CTET Paper 1, Paper 2, or State Teacher Eligibility Tests. Boosts profile visibility to top institutions.
            </Typography>
            {isCtetQualified && (
              <TextField
                fullWidth
                size="small"
                label="CTET / TET Details (Paper, Year, Score/Roll No)"
                value={ctetDetails}
                onChange={(e) => setCtetDetails(e.target.value)}
                placeholder="e.g. CTET Paper 2 (Mathematics & Science) - Dec 2023, Score: 112/150"
                sx={{ bgcolor: 'white' }}
              />
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Video Resume / Demo Lecture */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <VideoIcon fontSize="small" color="primary" /> Teaching Demo Video (High Recruiter Impact)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Link a 3-10 minute video demonstration of your pedagogy or classroom lecture (YouTube, Vimeo, Google Drive, or Loom).
          </Typography>
          <TextField
            fullWidth
            label="Demo Video URL"
            margin="normal"
            value={demoVideoUrl}
            onChange={(e) => setDemoVideoUrl(e.target.value)}
            placeholder="https://youtu.be/... or https://drive.google.com/..."
          />

          {/* AI Video Verification Status Banner */}
          {demoVideoUrl && (
            <Box sx={{ mt: 1.5, mb: 1 }}>
              {demoVideoStatus === 'Verified' && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ color: '#16a34a' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#166534' }}>
                        AI Verified Teaching Demonstration
                      </Typography>
                    </Box>
                    <Chip label={demoVideoSubject ? `Subject: ${demoVideoSubject}` : 'Pedagogy Verified'} size="small" color="success" sx={{ fontWeight: 'bold' }} />
                  </Box>
                  {demoVideoSummary && (
                    <Typography variant="body2" sx={{ color: '#14532d', mb: 1 }}>
                      <b>Lesson Demonstrated:</b> {demoVideoSummary}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: '#15803d', display: 'block' }}>
                    ✓ Confirmed academic teaching content • No objectionable material detected • Verified badge visible to recruiters.
                  </Typography>
                </Paper>
              )}

              {demoVideoStatus === 'Pending' && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <HourglassIcon sx={{ color: '#d97706' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#92400e' }}>
                      AI Content Moderation & Verification in Progress...
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#78350f' }}>
                    Our multimodal AI is analyzing your demo video to verify instructional content and safety. This typically completes in 1-2 minutes.
                  </Typography>
                </Paper>
              )}

              {demoVideoStatus === 'Rejected' && (
                <Alert severity="error" sx={{ borderRadius: 2, mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Demo Video Verification Failed
                  </Typography>
                  <Typography variant="body2">
                    {demoVideoRejectionReason || 'The submitted video does not appear to contain educational/teaching instruction or violates safety guidelines.'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                    Please update the link with a classroom, whiteboard, or concept lecture demonstration.
                  </Typography>
                </Alert>
              )}

              {demoVideoStatus === 'Unverified' && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" color="text.secondary">
                    Saving your profile will automatically submit this video for AI verification.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={isVerifyingVideo ? <CircularProgress size={14} /> : <RefreshIcon />}
                    onClick={handleReverifyVideo}
                    disabled={isVerifyingVideo}
                  >
                    Verify Now
                  </Button>
                </Box>
              )}

              {videoActionMsg && (
                <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                  {videoActionMsg}
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Confidentiality & Current Institution */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SecurityIcon fontSize="small" color="primary" /> Current Employment & Privacy Protection
          </Typography>
          <TextField
            fullWidth
            label="Current Institution / School / College"
            margin="normal"
            value={currentInstitution}
            onChange={(e) => setCurrentInstitution(e.target.value)}
            placeholder="e.g. Delhi Public School, R.K. Puram"
          />
          <TextField
            fullWidth
            label="Confidentiality: Blocked Institutions (Comma separated)"
            margin="normal"
            value={blockedInstitutions}
            onChange={(e) => setBlockedInstitutions(e.target.value)}
            placeholder="e.g. Current Employer Name, Sister Campuses"
            helperText="Institutions listed here will be blocked from viewing your profile in candidate searches."
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button 
              type="button" 
              variant="outlined" 
              fullWidth
              size="large"
              onClick={() => navigate('/candidate/dashboard')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              size="large"
              disabled={updateProfileMutation.isPending}
              sx={{ textTransform: 'none', fontWeight: 600, py: 1.5 }}
            >
              {updateProfileMutation.isPending ? 'Saving Profile...' : 'Save & Update Profile'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* DPDP Act 2023 & App Store Compliant Self-Serve Account Deletion */}
      <Paper variant="outlined" sx={{ mt: 4, p: 3, borderColor: 'error.light', bgcolor: 'rgba(211, 47, 47, 0.03)', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
          Account Deletion &amp; Data Erasure
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Permanently delete your account and anonymize all personal data in compliance with India DPDP Act 2023 and Google/Apple privacy standards. This will immediately revoke your active login session, anonymize your email and name, and purge your resumes, demo videos, and application history. This action cannot be reversed.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="medium"
          onClick={() => setOpenDeleteDialog(true)}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Delete Account &amp; Erase Personal Data
        </Button>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => !isDeleting && setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Delete Account Permanently?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your account? All your personal details, resumes, applications, and saved preferences will be irreversibly erased or anonymized.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            disabled={isDeleting}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteAccount} 
            disabled={isDeleting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {isDeleting ? 'Deleting Account...' : 'Yes, Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
