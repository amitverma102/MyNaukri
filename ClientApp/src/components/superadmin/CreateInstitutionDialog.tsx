import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Alert, MenuItem, Box, Avatar, Typography, CircularProgress 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import BusinessIcon from '@mui/icons-material/Business';
import api, { getMediaUrl } from '../../api/axios';

interface CreateProps {
  open: boolean;
  onClose: () => void;
}

const CreateInstitutionDialog: React.FC<CreateProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    name: '', code: '', type: 0, maxRecruiters: 5, address: '', city: '', state: '', 
    pinCode: '', email: '', phone: '', website: '', logoUrl: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
  });
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo image must not exceed 5 MB.');
        return;
      }
      setLogoPreview(URL.createObjectURL(file));

      try {
        setUploadingLogo(true);
        setError('');
        const data = new FormData();
        data.append('file', file);
        const res = await api.post('/superadmin/institutions/upload-logo', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const uploadedUrl = res.data.logoUrl || res.data.LogoUrl || '';
        setFormData(prev => ({ ...prev, logoUrl: uploadedUrl }));
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to upload logo.');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

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
      if (payload.logoUrl === '') payload.logoUrl = null;

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

        {/* Institution Logo Picker */}
        <Box sx={{ p: 2, mb: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={logoPreview || getMediaUrl(formData.logoUrl)}
            variant="rounded"
            sx={{ width: 56, height: 56, bgcolor: 'primary.light' }}
          >
            <BusinessIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Institution Logo
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              PNG, JPG, SVG up to 5 MB
            </Typography>
            <Button
              variant="outlined"
              component="label"
              size="small"
              disabled={uploadingLogo}
              startIcon={uploadingLogo ? <CircularProgress size={14} /> : <CloudUploadIcon />}
              sx={{ textTransform: 'none' }}
            >
              {uploadingLogo ? 'Uploading...' : formData.logoUrl ? 'Change Logo' : 'Select Logo'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleLogoSelect}
              />
            </Button>
          </Box>
        </Box>
        
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
          disabled={loading || uploadingLogo || !formData.name || !formData.code || !formData.adminFirstName || !formData.adminLastName || !formData.adminEmail || !formData.adminPassword}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateInstitutionDialog;
