import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CallEndIcon from '@mui/icons-material/CallEnd';
import TimerIcon from '@mui/icons-material/Timer';
import LockIcon from '@mui/icons-material/Lock';
import VideoCameraFrontIcon from '@mui/icons-material/VideoCameraFront';

import { parseZoomMeeting } from '../../utils/zoomUtils';
import { formatDateTime } from '../../utils/dateUtils';

interface EmbeddedZoomMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  interviewLink: string | null | undefined;
  jobTitle?: string;
  candidateName?: string;
  recruiterName?: string;
  companyName?: string;
  interviewDate?: string | null;
  currentUserDisplayName?: string;
}

export default function EmbeddedZoomMeetingDialog({
  open,
  onClose,
  interviewLink,
  jobTitle = 'Job Interview',
  candidateName,
  recruiterName,
  companyName,
  interviewDate,
  currentUserDisplayName
}: EmbeddedZoomMeetingDialogProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Derive participant display name from props or local storage
  const displayName = useMemo(() => {
    if (currentUserDisplayName) return currentUserDisplayName;
    const storedName = localStorage.getItem('user_name');
    if (storedName) return storedName;
    return candidateName || recruiterName || 'Participant';
  }, [currentUserDisplayName, candidateName, recruiterName]);

  // Parse Zoom URL
  const meeting = useMemo(() => {
    return parseZoomMeeting(interviewLink, displayName);
  }, [interviewLink, displayName]);

  // Call duration counter
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (open) {
      setElapsedSeconds(0);
      setIframeLoaded(false);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [open]);

  // Format call duration as MM:SS or HH:MM:SS
  const formatDuration = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
  };

  const handleConfirmClose = () => {
    if (window.confirm('Are you sure you want to leave the interview room?')) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleConfirmClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isFullScreen}
      slotProps={{
        paper: {
          sx: {
            height: isFullScreen ? '100vh' : '88vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#090d16',
            borderRadius: isFullScreen ? 0 : 3,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }
        }
      }}
    >
      {/* Top Header / Control Bar */}
      <DialogTitle
        sx={{
          bgcolor: '#0f172a',
          color: '#f8fafc',
          px: 3,
          py: 1.75,
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        {/* Left: Meeting Branding & Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: '#0284c7',
              color: '#ffffff',
              boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)'
            }}
          >
            <VideocamIcon fontSize="medium" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                EduKey360 Live Interview
              </Typography>
              <Chip
                label="Zoom Powered"
                size="small"
                sx={{
                  bgcolor: 'rgba(2, 132, 199, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  height: 20
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {jobTitle} {companyName ? `• ${companyName}` : ''}
              {candidateName ? ` • Candidate: ${candidateName}` : ''}
              {interviewDate ? ` (${formatDateTime(interviewDate, '')})` : ''}
            </Typography>
          </Box>
        </Box>

        {/* Center: Meeting Credentials & Live Timer */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Live Call Timer */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.5,
              bgcolor: 'rgba(15, 118, 110, 0.2)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              borderRadius: 2
            }}
          >
            <TimerIcon sx={{ fontSize: 16, color: '#2dd4bf' }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2dd4bf', fontFamily: 'monospace' }}>
              {formatDuration(elapsedSeconds)}
            </Typography>
          </Box>

          {/* Meeting ID */}
          {meeting.meetingId && (
            <Tooltip title="Click to copy Meeting ID">
              <Chip
                icon={<VideoCameraFrontIcon sx={{ '&&': { color: '#38bdf8' } }} />}
                label={`ID: ${meeting.formattedMeetingId || meeting.meetingId}`}
                size="small"
                onClick={() => copyToClipboard(meeting.meetingId, 'Meeting ID')}
                deleteIcon={<ContentCopyIcon sx={{ '&&': { color: '#94a3b8', fontSize: 14 } }} />}
                onDelete={() => copyToClipboard(meeting.meetingId, 'Meeting ID')}
                sx={{
                  bgcolor: 'rgba(30, 41, 59, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#1e293b' }
                }}
              />
            </Tooltip>
          )}

          {/* Passcode */}
          {meeting.passcode && (
            <Tooltip title="Click to copy Passcode">
              <Chip
                icon={<LockIcon sx={{ '&&': { color: '#f59e0b' } }} />}
                label={`Passcode: ${meeting.passcode}`}
                size="small"
                onClick={() => copyToClipboard(meeting.passcode, 'Passcode')}
                deleteIcon={<ContentCopyIcon sx={{ '&&': { color: '#94a3b8', fontSize: 14 } }} />}
                onDelete={() => copyToClipboard(meeting.passcode, 'Passcode')}
                sx={{
                  bgcolor: 'rgba(30, 41, 59, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#1e293b' }
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* External Zoom App Launcher */}
          {meeting.originalUrl && (
            <Tooltip title="Open in native Zoom App / external window">
              <Button
                variant="outlined"
                size="small"
                href={meeting.originalUrl}
                target="_blank"
                rel="noreferrer"
                startIcon={<OpenInNewIcon fontSize="small" />}
                sx={{
                  borderColor: '#334155',
                  color: '#94a3b8',
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  py: 0.4,
                  '&:hover': { borderColor: '#475569', color: '#f8fafc', bgcolor: 'rgba(255,255,255,0.05)' }
                }}
              >
                Open in Zoom App
              </Button>
            </Tooltip>
          )}

          {/* Toggle Fullscreen */}
          <Tooltip title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton
              size="small"
              onClick={() => setIsFullScreen(!isFullScreen)}
              sx={{ color: '#94a3b8', '&:hover': { color: '#f8fafc' } }}
            >
              {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          {/* End / Leave Call */}
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<CallEndIcon fontSize="small" />}
            onClick={handleConfirmClose}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 2,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            Leave Call
          </Button>
        </Box>
      </DialogTitle>

      {/* Main Viewport Container */}
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', bgcolor: '#000000' }}>
        {/* Loading Spinner during initial handshake */}
        {!iframeLoaded && meeting.webClientUrl && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#090d16',
              zIndex: 1,
              gap: 2
            }}
          >
            <CircularProgress size={48} sx={{ color: '#0284c7' }} />
            <Typography variant="body1" sx={{ color: '#f8fafc', fontWeight: 600 }}>
              Connecting to EduKey360 Zoom Meeting Room...
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Joining as: <strong style={{ color: '#38bdf8' }}>{displayName}</strong>
            </Typography>
          </Box>
        )}

        {/* Embedded Zoom Iframe */}
        {meeting.webClientUrl ? (
          <Box sx={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
            <iframe
              src={meeting.webClientUrl}
              title="EduKey360 Live Zoom Meeting"
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-top-navigation-by-user-activation"
              onLoad={() => setIframeLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
            />
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: '#fff', my: 'auto' }}>
            <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto', mb: 2 }}>
              No valid Zoom meeting link found for this interview. Please check the interview details or request a new meeting link from the recruiter.
            </Alert>
            {meeting.originalUrl && (
              <Button variant="contained" href={meeting.originalUrl} target="_blank">
                Try Opening Link
              </Button>
            )}
          </Box>
        )}

        {/* Bottom Helper Bar */}
        <Box
          sx={{
            bgcolor: '#0f172a',
            px: 2.5,
            py: 1,
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
            Microphone & Camera Enabled • Click &apos;Allow&apos; when prompted by browser to enable devices.
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Having trouble connecting in-app?
            </Typography>
            <Button
              size="small"
              variant="text"
              href={meeting.originalUrl}
              target="_blank"
              rel="noreferrer"
              sx={{ color: '#38bdf8', textTransform: 'none', fontSize: '0.75rem', p: 0, minWidth: 'auto' }}
            >
              Launch in Zoom Desktop Application &rarr;
            </Button>
          </Box>
        </Box>
      </DialogContent>

      {/* Snackbar feedback for copied text */}
      <Snackbar
        open={!!copiedField}
        autoHideDuration={2500}
        onClose={() => setCopiedField(null)}
        message={`${copiedField} copied to clipboard`}
      />
    </Dialog>
  );
}
