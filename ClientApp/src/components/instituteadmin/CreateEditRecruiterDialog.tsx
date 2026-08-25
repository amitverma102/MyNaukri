import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Grid
} from '@mui/material';
import api from '../../api/axios';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recruiterToEdit?: any; // If null, it's create mode
}

const CreateEditRecruiterDialog: React.FC<Props> = ({ open, onClose, onSuccess, recruiterToEdit }) => {
  const isEdit = !!recruiterToEdit;
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    designation: '',
    department: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setFormData({
          firstName: recruiterToEdit.firstName || '',
          lastName: recruiterToEdit.lastName || '',
          email: recruiterToEdit.email || '',
          mobile: recruiterToEdit.mobile || '',
          designation: recruiterToEdit.designation || '',
          department: recruiterToEdit.department || '',
          password: '' // Don't allow password editing here normally, handled via reset flow
        });
      } else {
        setFormData({
          firstName: '', lastName: '', email: '', mobile: '', designation: '', department: '', password: ''
        });
      }
      setError('');
    }
  }, [open, recruiterToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        await api.put(`/instituteadmin/recruiters/${recruiterToEdit.id}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobile: formData.mobile,
          designation: formData.designation,
          department: formData.department
        });
      } else {
        await api.post('/instituteadmin/recruiters', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.message) {
          setError(err.response.data.message);
        } else if (err.response.data.errors) {
          const firstError = Object.values(err.response.data.errors)[0] as string[];
          setError(firstError[0] || 'Validation error');
        } else {
          setError(err.response.data.title || 'Failed to save recruiter');
        }
      } else {
        setError('Failed to save recruiter');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Recruiter' : 'Create Recruiter'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth name="firstName" label="First Name" value={formData.firstName} onChange={handleChange} required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth name="lastName" label="Last Name" value={formData.lastName} onChange={handleChange} required />
            </Grid>
            {!isEdit && (
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required />
              </Grid>
            )}
            {!isEdit && (
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth name="password" label="Temporary Password" type="password" value={formData.password} onChange={handleChange} required />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth name="mobile" label="Mobile" value={formData.mobile} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth name="designation" label="Designation" value={formData.designation} onChange={handleChange} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth name="department" label="Department" value={formData.department} onChange={handleChange} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateEditRecruiterDialog;
