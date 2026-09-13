import { Typography, Container, Grid, Card, CardContent, Button, Box, Avatar, Alert, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getMediaUrl } from '../api/axios';
import RechargeModal from './instituteadmin/RechargeModal';
import CreditTransactionTable from './superadmin/CreditTransactionTable';
import BusinessIcon from '@mui/icons-material/Business';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function InstituteAdminDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [recruiterSummary, setRecruiterSummary] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoMsg, setLogoMsg] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardRes, summaryRes, instRes] = await Promise.all([
        api.get('/instituteadmin/wallet/dashboard'),
        api.get('/instituteadmin/recruiters/summary'),
        api.get('/instituteadmin/institution').catch(() => null)
      ]);
      setDashboard(dashboardRes.data);
      setRecruiterSummary(summaryRes.data);
      if (instRes) {
        setInstitution(instRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setLogoMsg({ text: 'Logo image must not exceed 5 MB.', severity: 'error' });
        return;
      }
      try {
        setIsUploadingLogo(true);
        setLogoMsg(null);
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/instituteadmin/institution/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const updatedLogoUrl = res.data.logoUrl || res.data.LogoUrl;
        setInstitution((prev: any) => ({ ...prev, logoUrl: updatedLogoUrl, LogoUrl: updatedLogoUrl }));
        setLogoMsg({ text: 'Institution logo updated successfully!', severity: 'success' });
      } catch (err: any) {
        setLogoMsg({ text: err.response?.data?.message || err.response?.data || 'Failed to upload logo.', severity: 'error' });
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const isLimitReached = recruiterSummary && !recruiterSummary.canCreateRecruiter;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Institute Admin Dashboard
      </Typography>

      {/* Institution Branding Banner */}
      {institution && (
        <Card sx={{ mb: 4, p: 1, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                src={getMediaUrl(institution.logoUrl || institution.LogoUrl)}
                variant="rounded"
                sx={{
                  width: 76,
                  height: 76,
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  p: 0.8,
                  flexShrink: 0,
                  '& img': { objectFit: 'contain' }
                }}
              >
                <BusinessIcon sx={{ fontSize: 44, color: 'primary.main' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {institution.name || institution.Name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Code: <strong>{institution.code || institution.Code}</strong> • {institution.contactEmail || institution.ContactEmail}
                </Typography>
                {institution.address && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {institution.address}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
              <Button
                variant="outlined"
                component="label"
                size="small"
                disabled={isUploadingLogo}
                startIcon={isUploadingLogo ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {isUploadingLogo ? 'Uploading...' : institution.logoUrl || institution.LogoUrl ? 'Change Logo' : 'Upload Logo'}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/jpg,image/svg+xml"
                  onChange={handleLogoUpload}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Recommended: 200x200 PNG or SVG
              </Typography>
            </Box>
          </CardContent>
          {logoMsg && (
            <Box sx={{ px: 2, pb: 1 }}>
              <Alert severity={logoMsg.severity} onClose={() => setLogoMsg(null)}>
                {logoMsg.text}
              </Alert>
            </Box>
          )}
        </Card>
      )}
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText', height: '100%', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6">Institution Wallet Balance</Typography>
              <Typography variant="h2" sx={{ mt: 2 }}>{dashboard?.availableCredits ?? 0}</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  Total Purchased: {dashboard?.totalPurchasedCredits ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Allocated: {dashboard?.totalAllocatedCredits ?? 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Unused Credits: {dashboard?.unusedCredits ?? 0}
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 3, bgcolor: 'white', color: 'secondary.main', '&:hover': { bgcolor: '#f5f5f5' }, textTransform: 'none', fontWeight: 600 }}
                onClick={() => setIsPurchaseModalOpen(true)}
              >
                Recharge Credits
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recruiter Summary</Typography>
              {recruiterSummary ? (
                <Box>
                  <Typography variant="body1">
                    Active Recruiters: <strong>{recruiterSummary.currentRecruiters} / {recruiterSummary.maxRecruiters}</strong>
                  </Typography>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                    Available Slots: <strong>{recruiterSummary.availableSlots}</strong>
                  </Typography>
                  
                  {isLimitReached && (
                    <Typography color="error" variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
                      ⚠ Maximum recruiter limit reached.
                    </Typography>
                  )}

                  <Button 
                    variant="outlined" 
                    color="primary"
                    onClick={() => navigate('/instituteadmin/recruiters')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Manage Recruiters
                  </Button>
                </Box>
              ) : (
                <Typography>Loading summary...</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <CreditTransactionTable 
          apiEndpoint="/instituteadmin/wallet/transactions" 
          hideInstitutionColumn={true} 
        />
      </Box>

      <RechargeModal 
        open={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        onSuccess={() => {
          setIsPurchaseModalOpen(false);
          fetchData();
        }} 
      />
    </Container>
  );
}
