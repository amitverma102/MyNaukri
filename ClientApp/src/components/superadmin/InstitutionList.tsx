import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, Button, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert
} from '@mui/material';
import api, { getMediaUrl } from '../../api/axios';
import CreateInstitutionDialog from './CreateInstitutionDialog';
import AddInstitutionCreditsDialog from './AddInstitutionCreditsDialog';
import SetMaxRecruitersDialog from './SetMaxRecruitersDialog';

interface Institution {
  id: string;
  name: string;
  code: string;
  type: number;
  city: string;
  state: string;
  status: number;
  creditBalance: number;
  maxRecruiters: number;
  logoUrl?: string;
  createdDate: string;
  instituteAdminName?: string | null;
  instituteAdminEmail?: string | null;
}

const InstitutionList: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  
  const [limitDialogInstId, setLimitDialogInstId] = useState<string | null>(null);
  const [limitDialogCurrentMax, setLimitDialogCurrentMax] = useState<number>(0);
  const [resetPasswordInst, setResetPasswordInst] = useState<Institution | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const fetchInstitutions = async () => {
    try {
      const response = await api.get(`/superadmin/institutions?page=${page + 1}&pageSize=${pageSize}`);
      setInstitutions(response.data?.items || []);
      setTotalRecords(response.data?.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching institutions', error);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [page, pageSize]);

  const handleUploadInstLogo = async (instId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo file must not exceed 5 MB.');
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post(`/superadmin/institutions/${instId}/logo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fetchInstitutions();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to update institution logo.');
      }
    }
  };

  const handleResetAdminPassword = async () => {
    if (!resetPasswordInst) return;
    if (newAdminPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordError('');
    try {
      await api.post(`/superadmin/institutions/${resetPasswordInst.id}/admin/reset-password`, {
        newPassword: newAdminPassword
      });
      alert('Institute Admin password reset successfully.');
      setResetPasswordInst(null);
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      setResetPasswordError(err.response?.data?.message || err.response?.data || 'Failed to reset Institute Admin password.');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Institutions</Typography>
        <Button variant="contained" color="primary" onClick={() => setOpenCreate(true)}>
          Add Institution
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 60 }}>Logo</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Institute Admin</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Max Recruiters</TableCell>
              <TableCell>Credits</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {institutions.map((inst) => (
              <TableRow key={inst.id}>
                <TableCell>
                  <Avatar
                    src={getMediaUrl(inst.logoUrl)}
                    variant="rounded"
                    sx={{ 
                      width: 44, 
                      height: 44, 
                      bgcolor: '#ffffff', 
                      border: '1px solid #e2e8f0',
                      p: 0.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      fontSize: '0.9rem',
                      '& img': { objectFit: 'contain' }
                    }}
                  >
                    {inst.name ? inst.name[0] : 'I'}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{inst.name}</TableCell>
                <TableCell>
                  {inst.instituteAdminName ? (
                    <>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{inst.instituteAdminName}</Typography>
                      <Typography variant="caption" color="text.secondary">{inst.instituteAdminEmail}</Typography>
                    </>
                  ) : <Typography variant="body2" color="text.secondary">No admin assigned</Typography>}
                </TableCell>
                <TableCell>{inst.code}</TableCell>
                <TableCell>{inst.city || '-'}</TableCell>
                <TableCell>{inst.status === 0 ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>{inst.maxRecruiters}</TableCell>
                <TableCell>{inst.creditBalance}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    component="label"
                    sx={{ mr: 1, textTransform: 'none' }}
                  >
                    Logo
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleUploadInstLogo(inst.id, e)}
                    />
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => setSelectedInstId(inst.id)} sx={{ mr: 1, textTransform: 'none' }}>
                    Add Credits
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => { setLimitDialogInstId(inst.id); setLimitDialogCurrentMax(inst.maxRecruiters); }} sx={{ textTransform: 'none' }}>
                    Set Limit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!inst.instituteAdminEmail}
                    onClick={() => {
                      setResetPasswordInst(inst);
                      setNewAdminPassword('');
                      setConfirmAdminPassword('');
                      setResetPasswordError('');
                    }}
                    sx={{ mt: 1, textTransform: 'none' }}
                  >
                    Reset Admin Password
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalRecords}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      <CreateInstitutionDialog
        open={openCreate}
        onClose={() => {
          setOpenCreate(false);
          fetchInstitutions();
        }}
      />

      <AddInstitutionCreditsDialog
        open={!!selectedInstId}
        institutionId={selectedInstId || ''}
        onClose={() => {
          setSelectedInstId(null);
          fetchInstitutions();
        }}
      />

      <SetMaxRecruitersDialog
        open={!!limitDialogInstId}
        institutionId={limitDialogInstId || ''}
        currentMaxRecruiters={limitDialogCurrentMax}
        onClose={() => {
          setLimitDialogInstId(null);
          fetchInstitutions();
        }}
      />

      <Dialog
        open={!!resetPasswordInst}
        onClose={() => !resetPasswordLoading && setResetPasswordInst(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reset Institute Admin Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set a new password for {resetPasswordInst?.instituteAdminName} ({resetPasswordInst?.instituteAdminEmail}).
          </Typography>
          {resetPasswordError && <Alert severity="error" sx={{ mb: 2 }}>{resetPasswordError}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            label="New password"
            type="password"
            value={newAdminPassword}
            onChange={(event) => setNewAdminPassword(event.target.value)}
            slotProps={{ htmlInput: { minLength: 6 } }}
          />
          <TextField
            margin="dense"
            fullWidth
            label="Confirm new password"
            type="password"
            value={confirmAdminPassword}
            onChange={(event) => setConfirmAdminPassword(event.target.value)}
            slotProps={{ htmlInput: { minLength: 6 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordInst(null)} disabled={resetPasswordLoading}>Cancel</Button>
          <Button onClick={handleResetAdminPassword} variant="contained" disabled={resetPasswordLoading}>
            {resetPasswordLoading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InstitutionList;
