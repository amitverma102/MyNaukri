import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Container, CircularProgress, Box, Chip, Button, Avatar } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SchoolIcon from '@mui/icons-material/School';
import VideocamIcon from '@mui/icons-material/Videocam';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api, { getMediaUrl } from '../../api/axios';
import { formatDateTime } from '../../utils/dateUtils';
import { downloadCalendarInvite } from '../../utils/calendarDownload';
import EmbeddedZoomMeetingDialog from '../interview/EmbeddedZoomMeetingDialog';

export default function ApplicationStatus() {
  const [activeMeetingApp, setActiveMeetingApp] = useState<any | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ['candidate-applications'],
    queryFn: async () => {
      const response = await api.get('/jobapplications/candidate');
      return response.data;
    }
  });

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  const getStatusColor = (status: string | number) => {
    switch (status) {
      case 'Applied': case 0: return 'info';
      case 'UnderReview': case 1: return 'warning';
      case 'Shortlisted': return 'secondary';
      case 'InterviewScheduled': case 2: return 'primary';
      case 'Offered': case 3: return 'success';
      case 'Hired': return 'success';
      case 'Rejected': case 4: return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string | number) => {
    switch (status) {
      case 'Applied': case 0: return 'Applied';
      case 'UnderReview': case 1: return 'Under Review';
      case 'Shortlisted': return 'Shortlisted';
      case 'InterviewScheduled': case 2: return 'Interview Scheduled';
      case 'Offered': case 3: return 'Offered';
      case 'Hired': return 'Hired';
      case 'Rejected': case 4: return 'Rejected';
      default: return 'Unknown';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Application Status
      </Typography>

      {!applications || applications.length === 0 ? (
        <Typography color="text.secondary">You haven't applied to any jobs yet.</Typography>
      ) : (
        applications.map((app: any) => {
          const mode = app.interviewMode === 1 || app.interviewMode === 'InPerson' ? 'InPerson'
                     : app.interviewMode === 2 || app.interviewMode === 'Telephonic' ? 'Telephonic'
                     : 'Online';

          return (
            <Card key={app.id} sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, pr: 2 }}>
                  <Avatar
                    src={getMediaUrl(app.institutionLogoUrl)}
                    variant="rounded"
                    sx={{
                      width: 46,
                      height: 46,
                      bgcolor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      p: 0.5,
                      mt: 0.5,
                      flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      '& img': { objectFit: 'contain' }
                    }}
                  >
                    <SchoolIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h6">{app.jobTitle}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {app.companyName ? `${app.companyName} • ` : ''}Job ID: {app.jobId?.substring(0, 8)}
                    </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {app.aiMatchScore !== null && app.aiMatchScore !== undefined && (
                      <Chip
                        label={`AI Match: ${Math.round(app.aiMatchScore)}%`}
                        color={app.aiMatchScore >= 80 ? 'success' : app.aiMatchScore >= 55 ? 'warning' : 'default'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  {app.aiFeedback && (
                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                      <strong>AI Fitment Review:</strong> {app.aiFeedback}
                    </Typography>
                  )}
                  {(app.status === 'InterviewScheduled' || app.status === 2) && app.interviewDate && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #cce3ff' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0052cc' }}>
                          📅 Interview Scheduled: {formatDateTime(app.interviewDate)}
                        </Typography>
                        {mode === 'Online' && <Chip label="Online Video" size="small" color="primary" variant="filled" sx={{ height: 22 }} />}
                        {mode === 'InPerson' && <Chip label="In-Person / On-Site" size="small" color="success" variant="filled" sx={{ height: 22 }} />}
                        {mode === 'Telephonic' && <Chip label="Telephonic" size="small" color="warning" variant="filled" sx={{ height: 22 }} />}
                      </Box>

                      {mode === 'Online' && app.interviewLink && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<VideocamIcon />}
                            onClick={() => setActiveMeetingApp(app)}
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700 }}
                          >
                            Take Call in EduKey360
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small" 
                            href={app.interviewLink} 
                            target="_blank" 
                            rel="noreferrer"
                            startIcon={<OpenInNewIcon fontSize="small" />}
                            sx={{ textTransform: 'none', borderRadius: 1.5 }}
                          >
                            Open in Zoom App
                          </Button>
                        </Box>
                      )}

                      {mode === 'InPerson' && app.interviewVenue && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#1e293b' }}>
                          <strong>🏢 Venue / Address:</strong> {app.interviewVenue}
                        </Typography>
                      )}

                      {mode === 'Telephonic' && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#1e293b' }}>
                          <strong>📞 Phone Instructions:</strong> {app.interviewDetails || 'The recruiter will contact you on your registered phone number.'}
                        </Typography>
                      )}

                      {mode !== 'Telephonic' && app.interviewDetails && (
                        <Typography variant="body2" sx={{ mt: 1, color: '#475569', fontStyle: 'italic' }}>
                          <strong>Notes from Recruiter:</strong> {app.interviewDetails}
                        </Typography>
                      )}

                      <Box sx={{ mt: 1.5 }}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<CalendarMonthIcon fontSize="small" />}
                          onClick={() => downloadCalendarInvite(app.id, `interview_${app.jobTitle ? app.jobTitle.replace(/[^a-zA-Z0-9]/g, '_') : app.id.substring(0, 8)}.ics`)}
                          sx={{ textTransform: 'none', borderRadius: 1.5, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Add to Calendar (.ics)
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
              {(app.status === 'InterviewScheduled' || app.status === 2) && app.interviewDate && new Date(app.interviewDate) < new Date() ? (
                <Chip label="Interview Conducted • Result Awaited" color="warning" sx={{ fontWeight: 600 }} />
              ) : (
                <Chip label={getStatusLabel(app.status)} color={getStatusColor(app.status) as any} />
              )}
            </CardContent>
            </Card>
          );
        })
      )}

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
