import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Alert 
} from '@mui/material';
import api from '../../api/axios';

interface AddCreditsProps {
  open: boolean;
  institutionId: string;
  onClose: () => void;
}

const AddInstitutionCreditsDialog: React.FC<AddCreditsProps> = ({ open, institutionId, onClose }) => {
  const [credits, setCredits] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (credits <= 0) {
      setError('Credits must be positive');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`/superadmin/institutions/${institutionId}/credits`, { credits, reason });
      onClose();
    } catch (err: any) {
      setError(err.response?.data || 'Failed to add credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Credits to Institution</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TextField
          margin="normal"
          fullWidth
          label="Credits Amount"
          type="number"
          value={credits}
          onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
        />
        
        <TextField
          margin="normal"
          fullWidth
          label="Reason / Notes"
          multiline
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for manually adding credits..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || credits <= 0 || !reason.trim()}
        >
          Add Credits
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddInstitutionCreditsDialog;
