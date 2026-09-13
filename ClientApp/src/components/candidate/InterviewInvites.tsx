import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, Typography, Container, CircularProgress, Box, Button, Chip } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VideocamIcon from '@mui/icons-material/Videocam';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../api/axios';
import { formatDateTime } from '../../utils/dateUtils';
import { downloadCalendarInvite } from '../../utils/calendarDownload';
import EmbeddedZoomMeetingDialog from '../interview/EmbeddedZoomMeetingDialog';

export default function InterviewInvites() {
  const [activeMeetingApp, setActiveMeetingApp] = useState<any | null>(null);

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['candidate-interviews'],
    queryFn: async () => {
      const response = await api.get('/jobapplications/candidate/interviews');
      return response.data;
    }
  });

  if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3, fontWeight: 'bold' }}>
        <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
        Interview Invites
      </Typography>

      {!interviews || interviews.length === 0 ? (
        <Typography color="text.secondary">You don't have any upcoming interviews right now.</Typography>
      ) : (
        interviews.map((app: any) => {
          const mode = app.interviewMode === 1 || app.interviewMode === 'InPerson' ? 'InPerson'
                     : app.interviewMode === 2 || app.interviewMode === 'Telephonic' ? 'Telephonic'
                     : 'Online';

          return (
            <Card key={app.id} sx={{ mb: 2.5, borderLeft: 5, borderColor: 'primary.main', borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                      Interview for: {app.jobTitle}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: app.interviewDate && new Date(app.interviewDate) < new Date() ? 'text.secondary' : 'primary.main' }}>
                        📅 {formatDateTime(app.interviewDate, 'TBD')}
                      </Typography>
                      {app.interviewDate && new Date(app.interviewDate) < new Date() && (
                        <Chip label="Interview Completed • Result Awaited" color="warning" size="small" sx={{ fontWeight: 700 }} />
                      )}
                    </Box>
                  </Box>
                  <Box>
                    {mode === 'Online' && <Chip label="Online Video Call" color="primary" sx={{ fontWeight: 'bold' }} />}
                    {mode === 'InPerson' && <Chip label="In-Person / On-Site" color="success" sx={{ fontWeight: 'bold' }} />}
                    {mode === 'Telephonic' && <Chip label="Telephonic Interview" color="warning" sx={{ fontWeight: 'bold' }} />}
                  </Box>
                </Box>

                <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  {mode === 'Online' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#334155' }}>
                        Join the video meeting at the scheduled time:
                      </Typography>
                      {app.interviewLink ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Button 
                            variant="contained" 
                            color="primary"
                            size="small" 
                            startIcon={<VideocamIcon />}
                            onClick={() => setActiveMeetingApp(app)}
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 700, px: 2 }}
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
                      ) : (
                        <Typography variant="caption" color="textSecondary">Meeting link will be shared by recruiter</Typography>
                      )}
                    </Box>
                  )}

                  {mode === 'InPerson' && (
                    <Typography variant="body2" sx={{ color: '#1e293b' }}>
                      <strong>🏢 Venue / Address:</strong> {app.interviewVenue || 'Address will be provided by the institution.'}
                    </Typography>
                  )}

                  {mode === 'Telephonic' && (
                    <Typography variant="body2" sx={{ color: '#1e293b' }}>
                      <strong>📞 Dial-in Instructions:</strong> {app.interviewDetails || 'The interviewer will contact you on your registered phone number.'}
                    </Typography>
                  )}

                  {mode !== 'Telephonic' && app.interviewDetails && (
                    <Typography variant="body2" sx={{ mt: 1, color: '#475569', fontStyle: 'italic' }}>
                      <strong>Recruiter Instructions:</strong> {app.interviewDetails}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<CalendarMonthIcon fontSize="small" />}
                    onClick={() => downloadCalendarInvite(app.id, `interview_${app.jobTitle ? app.jobTitle.replace(/[^a-zA-Z0-9]/g, '_') : app.id.substring(0, 8)}.ics`)}
                    sx={{ textTransform: 'none', borderRadius: 1.5, cursor: 'pointer' }}
                  >
                    Download Calendar (.ics)
                  </Button>
                </Box>
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
