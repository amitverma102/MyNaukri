import { useState, useEffect } from 'react';
import { Box, Typography, Container, Paper, TextField, Button, Alert, CircularProgress, Link } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { API_BASE_URL } from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function CandidateProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [experience, setExperience] = useState<number>(0);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [currentSalary, setCurrentSalary] = useState<number | ''>('');
  const [expectedSalary, setExpectedSalary] = useState<number | ''>('');
  const [noticePeriod, setNoticePeriod] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [classesTaught, setClassesTaught] = useState('');
  const [boardsTaught, setBoardsTaught] = useState('');
  const [education, setEducation] = useState('');
  const [certifications, setCertifications] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      setCurrentSalary(profile.currentSalary ?? profile.CurrentSalary ?? '');
      setExpectedSalary(profile.expectedSalary ?? profile.ExpectedSalary ?? '');
      setNoticePeriod(profile.noticePeriod || profile.NoticePeriod || '');
      setCurrentLocation(profile.currentLocation || profile.CurrentLocation || '');
      setPreferredLocations(profile.preferredLocations || profile.PreferredLocations || '');
      setClassesTaught(profile.classesTaught || profile.ClassesTaught || '');
      setBoardsTaught(profile.boardsTaught || profile.BoardsTaught || '');
      setEducation(profile.education || profile.Education || '');
      setCertifications(profile.certifications || profile.Certifications || '');
    }
  }, [profile]);

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
        certifications
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadResumeMutation.mutate(e.target.files[0]);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }} gutterBottom>
          Update Your Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Complete your profile to get personalized job recommendations for the education sector.
        </Typography>

        {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
        {updateProfileMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to update profile.</Alert>}
        {uploadResumeMutation.isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to upload resume.</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              component="label"
              disabled={uploadResumeMutation.isPending}
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
                <Link href={`${API_BASE_URL}${resumeUrl}`} target="_blank" rel="noopener">
                  View Current Resume
                </Link>
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Accepted formats: PDF, DOC, DOCX. Uploading will automatically extract your skills!
          </Typography>

          <TextField
            fullWidth
            label="Professional Summary"
            multiline
            rows={4}
            margin="normal"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="E.g. Experienced middle school science teacher with a passion for interactive learning and STEM education..."
          />
          <TextField
            fullWidth
            label="Key Skills (Comma separated)"
            margin="normal"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Curriculum Design, Classroom Management, EdTech, Lesson Planning"
          />
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
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Current Salary (₹)"
              type="number"
              margin="normal"
              value={currentSalary}
              onChange={(e) => setCurrentSalary(e.target.value === '' ? '' : Number(e.target.value))}
            />
            <TextField
              fullWidth
              label="Expected Salary (₹)"
              type="number"
              margin="normal"
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Box>
          <TextField
            fullWidth
            label="Notice Period"
            margin="normal"
            value={noticePeriod}
            onChange={(e) => setNoticePeriod(e.target.value)}
            placeholder="e.g. 30 Days, Immediate"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="Current Location"
              margin="normal"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
            />
            <TextField
              fullWidth
              label="Preferred Locations"
              margin="normal"
              value={preferredLocations}
              onChange={(e) => setPreferredLocations(e.target.value)}
              placeholder="e.g. Delhi, Mumbai"
            />
          </Box>
          <TextField
            fullWidth
            label="Classes Taught"
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
            placeholder="e.g. CBSE, ICSE"
          />
          <TextField
            fullWidth
            label="Education / Degrees"
            margin="normal"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="e.g. B.Ed, M.Sc Mathematics"
          />
          <TextField
            fullWidth
            label="Certifications"
            margin="normal"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            placeholder="e.g. TEFL, Google Certified Educator"
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button 
              type="button" 
              variant="outlined" 
              fullWidth
              onClick={() => navigate('/candidate/dashboard')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
