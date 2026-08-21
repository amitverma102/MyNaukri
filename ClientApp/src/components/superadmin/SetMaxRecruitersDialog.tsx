import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Alert 
} from '@mui/material';
import api from '../../api/axios';

interface Props {
  open: boolean;
  institutionId: string;
  currentMaxRecruiters: number;
  onClose: () => void;
}

const SetMaxRecruitersDialog: React.FC<Props> = ({ open, institutionId, currentMaxRecruiters, onClose }) => {
  const [maxRecruiters, setMaxRecruiters] = useState(currentMaxRecruiters);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setMaxRecruiters(currentMaxRecruiters);
      setError('');
    }
  }, [open, currentMaxRecruiters]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await api.put(`/superadmin/institutions/${institutionId}/max-recruiters`, {
        maxRecruiters
      });
      onClose();
    } catch (err: any) {
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.errors) {
          const firstError = Object.values(err.response.data.errors)[0] as string[];
          setError(firstError[0] || 'Validation error');
        } else {
          setError(err.response.data.title || 'Failed to update limit');
        }
      } else {
        setError('Failed to update limit');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Set Recruiter Limit</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TextField 
          autoFocus
          margin="dense" 
          fullWidth 
          label="Maximum Recruiters" 
          type="number" 
          value={maxRecruiters} 
          onChange={(e) => setMaxRecruiters(Number(e.target.value))} 
          inputProps={{ min: 0 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || maxRecruiters < 0}
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SetMaxRecruitersDialog;
