import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Alert, MenuItem 
} from '@mui/material';
import api from '../../api/axios';

interface CreateProps {
  open: boolean;
  onClose: () => void;
}

const CreateInstitutionDialog: React.FC<CreateProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    name: '', code: '', type: 0, maxRecruiters: 5, address: '', city: '', state: '', 
    pinCode: '', email: '', phone: '', website: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Clean up empty strings for optional fields so they don't trigger backend validation errors
      const payload: any = { ...formData };
      if (payload.email === '') payload.email = null;
      if (payload.pinCode === '') payload.pinCode = null;
      if (payload.phone === '') payload.phone = null;
      if (payload.website === '') payload.website = null;
      if (payload.address === '') payload.address = null;
      if (payload.city === '') payload.city = null;
      if (payload.state === '') payload.state = null;

      await api.post('/superadmin/institutions', payload);
      onClose();
    } catch (err: any) {
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.errors) {
          const firstError = Object.values(err.response.data.errors)[0] as string[];
          setError(firstError[0] || 'Validation error');
        } else {
          setError(err.response.data.title || 'Failed to create institution');
        }
      } else {
        setError('Failed to create institution');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      // MUI select values are strings. The API expects InstitutionType as a
      // numeric enum value, so preserve its numeric type in the request body.
      [name]: (name === 'type' || name === 'maxRecruiters') ? Number(value) : value
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Institution</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <TextField margin="dense" fullWidth name="name" label="Name" value={formData.name} onChange={handleChange} required />
        <TextField margin="dense" fullWidth name="code" label="Code" value={formData.code} onChange={handleChange} required />
        <TextField margin="dense" fullWidth name="type" label="Type" select value={formData.type} onChange={handleChange}>
          <MenuItem value={0}>School</MenuItem>
          <MenuItem value={1}>College</MenuItem>
          <MenuItem value={2}>University</MenuItem>
          <MenuItem value={3}>Coaching Institute</MenuItem>
          <MenuItem value={4}>EdTech</MenuItem>
          <MenuItem value={5}>Consultancy</MenuItem>
          <MenuItem value={6}>Advisory</MenuItem>
          <MenuItem value={7}>Other</MenuItem>
        </TextField>
        <TextField margin="dense" fullWidth name="maxRecruiters" label="Max Recruiters" type="number" value={formData.maxRecruiters} onChange={handleChange} required />
        <TextField margin="dense" fullWidth name="email" label="Email" type="email" value={formData.email} onChange={handleChange} />
        <TextField margin="dense" fullWidth name="phone" label="Phone" value={formData.phone} onChange={handleChange} />
        <TextField margin="dense" fullWidth name="address" label="Address" value={formData.address} onChange={handleChange} />
        <TextField margin="dense" fullWidth name="city" label="City" value={formData.city} onChange={handleChange} />
        <TextField margin="dense" fullWidth name="state" label="State" value={formData.state} onChange={handleChange} />
        <TextField margin="dense" fullWidth name="pinCode" label="PIN Code" value={formData.pinCode} onChange={handleChange} />
        <TextField margin="dense" fullWidth name="website" label="Website" value={formData.website} onChange={handleChange} />

        {/* Institute Admin User Details */}
        <Alert severity="info" sx={{ mt: 2, mb: 1 }}>Initial Institute Administrator Details</Alert>
        <TextField margin="dense" fullWidth name="adminFirstName" label="Admin First Name" value={formData.adminFirstName} onChange={handleChange} required />
        <TextField margin="dense" fullWidth name="adminLastName" label="Admin Last Name" value={formData.adminLastName} onChange={handleChange} required />
        <TextField margin="dense" fullWidth name="adminEmail" label="Admin Email" type="email" value={formData.adminEmail} onChange={handleChange} required />
        <TextField margin="dense" fullWidth name="adminPassword" label="Admin Password" type="password" value={formData.adminPassword} onChange={handleChange} required />

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !formData.name || !formData.code || !formData.adminFirstName || !formData.adminLastName || !formData.adminEmail || !formData.adminPassword}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateInstitutionDialog;
