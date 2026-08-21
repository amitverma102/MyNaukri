import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, TextField, Button, Grid
} from '@mui/material';
import api from '../../api/axios';

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

const CreditTransactionTable: React.FC = () => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  
  const [search, setSearch] = useState('');
  const [tempSearch, setTempSearch] = useState('');

  const fetchTransactions = async () => {
    try {
      const response = await api.get(
        `/superadmin/credit-transactions?page=${page + 1}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
      );
      setTransactions(response.data?.items || []);
      setTotalRecords(response.data?.totalRecords || 0);
    } catch (error) {
      console.error('Error fetching transactions', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, pageSize, search]);

  const handleSearch = () => {
    setSearch(tempSearch);
    setPage(0);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Credit Transactions Audit</Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField 
              fullWidth 
              size="small" 
              label="Search (Txn ID, Institution, Reason)" 
              value={tempSearch}
              onChange={(e) => setTempSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Button variant="contained" onClick={handleSearch}>Filter</Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Txn ID</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Institution</TableCell>
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
                <TableCell>{new Date(tx.createdDate).toLocaleString()}</TableCell>
                <TableCell>{tx.institutionName}</TableCell>
                <TableCell>{tx.userName}</TableCell>
                <TableCell>{tx.transactionType}</TableCell>
                <TableCell align="right" sx={{ color: tx.credits > 0 ? 'success.main' : 'error.main' }}>
                  {tx.credits > 0 ? `+${tx.credits}` : tx.credits}
                </TableCell>
                <TableCell align="right">{tx.balanceAfter}</TableCell>
                <TableCell>{tx.reason || '-'}</TableCell>
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
    </Container>
  );
};

export default CreditTransactionTable;
