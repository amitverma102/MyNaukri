import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, Button 
} from '@mui/material';
import api from '../../api/axios';
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
  createdDate: string;
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Institutions</Typography>
        <Button variant="contained" color="primary" onClick={() => setOpenCreate(true)}>
          Add Institution
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
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
                <TableCell>{inst.name}</TableCell>
                <TableCell>{inst.code}</TableCell>
                <TableCell>{inst.city}</TableCell>
                <TableCell>{inst.status === 0 ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>{inst.maxRecruiters}</TableCell>
                <TableCell>{inst.creditBalance}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" onClick={() => setSelectedInstId(inst.id)} sx={{ mr: 1 }}>
                    Add Credits
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => { setLimitDialogInstId(inst.id); setLimitDialogCurrentMax(inst.maxRecruiters); }}>
                    Set Limit
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
        onClose={() => { setOpenCreate(false); fetchInstitutions(); }} 
      />

      {selectedInstId && (
        <AddInstitutionCreditsDialog
          open={!!selectedInstId}
          institutionId={selectedInstId}
          onClose={() => { setSelectedInstId(null); fetchInstitutions(); }}
        />
      )}

      {limitDialogInstId && (
        <SetMaxRecruitersDialog
          open={!!limitDialogInstId}
          institutionId={limitDialogInstId}
          currentMaxRecruiters={limitDialogCurrentMax}
          onClose={() => { setLimitDialogInstId(null); fetchInstitutions(); }}
        />
      )}
    </Container>
  );
};

export default InstitutionList;
