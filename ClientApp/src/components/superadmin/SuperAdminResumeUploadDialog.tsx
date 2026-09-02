import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import api from '../../api/axios';

interface SuperAdminResumeUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

const SuperAdminResumeUploadDialog: React.FC<SuperAdminResumeUploadDialogProps> = ({ open, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [parsingStatus, setParsingStatus] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (resumeId && (parsingStatus === 'UPLOADED' || parsingStatus === 'PROCESSING')) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/superadmin/candidates/resume-upload/${resumeId}/status`);
          setParsingStatus(res.data.status);
          
          if (res.data.status === 'PARSED' || res.data.status === 'FAILED') {
            setParsedData(res.data);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling resume status", err);
        }
      }, 3000); // poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resumeId, parsingStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setResumeId(null);
      setParsingStatus('');
      setParsedData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/superadmin/candidates/upload-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setResumeId(response.data.resumeId);
      setParsingStatus(response.data.status);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResumeId(null);
    setParsingStatus('');
    setParsedData(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Candidate Resume</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          {!resumeId && (
            <>
              <Typography variant="body2" color="text.secondary">
                Upload a candidate's resume (PDF, DOC, DOCX). Our AI will automatically parse the resume, create a candidate profile (or link to an existing one based on email), and extract skills and experience.
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
              >
                Select File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </Button>
              {file && <Typography variant="body2">Selected: {file.name}</Typography>}
            </>
          )}

          {resumeId && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              {parsingStatus === 'UPLOADED' || parsingStatus === 'PROCESSING' ? (
                <>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="h6">Processing Resume...</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Our AI is extracting candidate information. Please wait.
                  </Typography>
                </>
              ) : parsingStatus === 'PARSED' ? (
                <Alert severity="success" sx={{ textAlign: 'left' }}>
                  <strong>Resume Parsed Successfully!</strong><br />
                  Candidate: {parsedData?.candidateName}<br />
                  Email: {parsedData?.candidateEmail}
                </Alert>
              ) : (
                <Alert severity="error">
                  Parsing Failed. Could not extract candidate data.
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {!resumeId && (
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            color="primary" 
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SuperAdminResumeUploadDialog;
