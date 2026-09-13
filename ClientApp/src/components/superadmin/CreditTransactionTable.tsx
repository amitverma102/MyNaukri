import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, TextField, Button, Grid,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import api from '../../api/axios';
import { formatDateTime } from '../../utils/dateUtils';

interface CreditTransaction {
  transactionId: string;
  institutionName: string;
  userName: string;
  transactionType: string;
  credits: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdDate: string;
}

interface Institution {
  id: string;
  name: string;
}

interface CreditTransactionTableProps {
  apiEndpoint?: string;
  hideInstitutionColumn?: boolean;
}

const TRANSACTION_TYPES = [
  { value: 'InstitutionCreditPurchase', label: 'Credit Purchase' },
  { value: 'TopUp', label: 'Top-Up' },
  { value: 'AnnualRecharge', label: 'Annual Recharge' },
  { value: 'SuperAdminCreditAllocation', label: 'Super Admin Allocation' },
  { value: 'CreditAdjustment', label: 'Adjustment' },
  { value: 'CreditRefund', label: 'Refund' },
  { value: 'CreditExpiry', label: 'Expiry' },
  { value: 'InstitutionAdminCredit', label: 'Admin Credit' },
  { value: 'InstitutionToRecruiterAllocation', label: 'Recruiter Allocation' },
  { value: 'RecruiterNormalJobPosting', label: 'Normal Job Posting' },
  { value: 'RecruiterPlatinumJobPosting', label: 'Platinum Job Posting' },
  { value: 'RecruiterResumeDownload', label: 'Resume Download' },
  { value: 'RecruiterContactView', label: 'Contact View' }
];

const CreditTransactionTable: React.FC<CreditTransactionTableProps> = ({ 
  apiEndpoint = '/superadmin/credit-transactions',
  hideInstitutionColumn = false
}) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [search, setSearch] = useState('');
  const [tempSearch, setTempSearch] = useState('');

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  
  // Set default dates: fromDate = 7 days ago, toDate = today
  const defaultFromDate = new Date();
  defaultFromDate.setDate(defaultFromDate.getDate() - 7);
  
  const [institutionId, setInstitutionId] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [fromDate, setFromDate] = useState(defaultFromDate.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Temp states for filter application
  const [appliedFilters, setAppliedFilters] = useState({
    institutionId: '',
    transactionType: '',
    fromDate: defaultFromDate.toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });

  const fetchInstitutions = async () => {
    try {
      // Assuming a max pageSize for the dropdown or an endpoint without pagination.
      // Using page=1, pageSize=100 as per typical API limits in this project.
      const response = await api.get('/superadmin/institutions?page=1&pageSize=100');
      setInstitutions(response.data?.items || []);
    } catch (error) {
      console.error('Error fetching institutions', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      let queryParams = `?page=${page + 1}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`;
      
      if (appliedFilters.institutionId) {
        queryParams += `&institutionId=${appliedFilters.institutionId}`;
      }
      if (appliedFilters.transactionType) {
        queryParams += `&transactionType=${appliedFilters.transactionType}`;
      }
      if (appliedFilters.fromDate) {
        queryParams += `&fromDate=${appliedFilters.fromDate}`;
      }
      if (appliedFilters.toDate) {
        queryParams += `&toDate=${appliedFilters.toDate}`;
      }

      const response = await api.get(`${apiEndpoint}${queryParams}`);
      setTransactions(response.data?.items || []);
      setTotalRecords(response.data?.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching transactions', error);
    }
  };

  useEffect(() => {
    if (!hideInstitutionColumn) {
      fetchInstitutions();
    }
  }, [hideInstitutionColumn]);

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, search, apiEndpoint, appliedFilters]);

  const handleApplyFilters = () => {
    setSearch(tempSearch);
    setAppliedFilters({
      institutionId,
      transactionType,
      fromDate,
      toDate
    });
    setPage(0);
  };

  const handleResetFilters = () => {
    setTempSearch('');
    setSearch('');
    setInstitutionId('');
    setTransactionType('');
    setFromDate(defaultFromDate.toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setAppliedFilters({
      institutionId: '',
      transactionType: '',
      fromDate: defaultFromDate.toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0]
    });
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 0, sm: 2 } }} disableGutters>
      <Typography variant="h4" sx={{ mb: 2 }}>Credit Transactions Audit</Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField 
              fullWidth 
              size="small" 
              label="Search (Txn ID, Reason)" 
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
            />
          </Grid>

          {!hideInstitutionColumn && (
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Institution</InputLabel>
                <Select
                  value={institutionId}
                  label="Institution"
                  onChange={(e) => setInstitutionId(e.target.value)}
                >
                  <MenuItem value=""><em>All Institutions</em></MenuItem>
                  {institutions.map((inst) => (
                    <MenuItem key={inst.id} value={inst.id}>{inst.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Nature of Credit</InputLabel>
              <Select
                value={transactionType}
                label="Nature of Credit"
                onChange={(e) => setTransactionType(e.target.value)}
              >
                <MenuItem value=""><em>All Types</em></MenuItem>
                {TRANSACTION_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleApplyFilters} sx={{ flex: 1 }}>Filter</Button>
            <Button variant="outlined" onClick={handleResetFilters} sx={{ flex: 1 }}>Reset</Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Txn ID</TableCell>
              <TableCell>Date</TableCell>
              {!hideInstitutionColumn && <TableCell>Institution</TableCell>}
              <TableCell>User</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Credits</TableCell>
              <TableCell align="right">Bal. After</TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.transactionId}>
                <TableCell>{tx.transactionId}</TableCell>
                <TableCell>{formatDateTime(tx.createdDate)}</TableCell>
                {!hideInstitutionColumn && <TableCell>{tx.institutionName}</TableCell>}
                <TableCell>{tx.userName}</TableCell>
                <TableCell>{tx.transactionType}</TableCell>
                <TableCell align="right">
                  {(() => {
                    const isDebit = tx.balanceAfter < tx.balanceBefore;
                    const amount = Math.abs(Number(tx.credits));
                    return (
                      <Typography sx={{ color: isDebit ? 'error.main' : 'success.main' }}>
                        {isDebit ? '-' : '+'}{amount}
                      </Typography>
                    );
                  })()}
                </TableCell>
                <TableCell align="right">{tx.balanceAfter}</TableCell>
                <TableCell>{tx.reason || '-'}</TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={hideInstitutionColumn ? 7 : 8} align="center" sx={{ py: 3 }}>
                  No credit transactions found.
                </TableCell>
              </TableRow>
            )}
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
    </Container>
  );
};

export default CreditTransactionTable;
