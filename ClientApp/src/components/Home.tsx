import { Box, Typography, Button, TextField, Grid, Card, CardContent, InputAdornment, Chip, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import SearchIcon from '@mui/icons-material/Search';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ComputerIcon from '@mui/icons-material/Computer';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import AnalyticsIcon from '@mui/icons-material/Analytics';

export default function Home() {
  const navigate = useNavigate();

  const { data: topInstitutions = [], isLoading } = useQuery({
    queryKey: ['top-institutions'],
    queryFn: async () => {
      const response = await api.get('/jobs/top-institutions');
      return response.data;
    }
  });

  return (
    <Box sx={{ flexGrow: 1, pb: 8, bgcolor: '#f8f9fa' }}>
      
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', py: 8, px: 2, bgcolor: 'white' }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
          Find your dream job now
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>
          5 lakh+ jobs for you to explore
        </Typography>

        {/* Search Bar */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            maxWidth: '900px',
            mx: 'auto',
            bgcolor: 'white',
            borderRadius: '50px',
            boxShadow: '0px 4px 20px rgba(0,0,0,0.08)',
            p: 1
          }}
        >
          <TextField 
            placeholder="Enter skills / designations / companies"
            variant="standard"
            slotProps={{
              input: {
                disableUnderline: true,
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
              }
            }}
            sx={{ flex: 2, px: 2, borderRight: '1px solid #e0e0e0' }}
          />
          <TextField 
            placeholder="Select experience"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            sx={{ flex: 1, px: 2, borderRight: '1px solid #e0e0e0' }}
          />
          <TextField 
            placeholder="Enter location"
            variant="standard"
            slotProps={{ input: { disableUnderline: true } }}
            sx={{ flex: 1, px: 2 }}
          />
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate('/jobs')}
            sx={{ 
              borderRadius: '50px', 
              px: 4, 
              py: 1.5,
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            Search
          </Button>
        </Box>
      </Box>

      {/* Quick Links Section */}
      <Box sx={{ maxWidth: '1000px', mx: 'auto', mt: -3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          <Chip icon={<SchoolIcon />} label="Teaching" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Teaching' } })} />
          <Chip icon={<AccountBalanceIcon />} label="Principal" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Principal' } })} />
          <Chip icon={<PeopleIcon />} label="Administrator" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Administrator' } })} />
          <Chip icon={<EngineeringIcon />} label="TGT / PGT" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'TGT' } })} />
          <Chip icon={<AnalyticsIcon />} label="Primary Teacher" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Primary Teacher' } })} />
          <Chip icon={<ComputerIcon />} label="Pre-Primary" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Pre-Primary' } })} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 2 }}>
          <Chip icon={<PeopleIcon />} label="Guest Faculty" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Guest Faculty' } })} />
          <Chip icon={<EngineeringIcon />} label="Physical Education" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Physical Education' } })} />
          <Chip icon={<SchoolIcon />} label="Research" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Research' } })} />
          <Chip icon={<WorkOutlineIcon />} label="Special Educator" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Special Educator' } })} />
          <Chip icon={<AnalyticsIcon />} label="Librarian" variant="outlined" sx={{ bgcolor: 'white', p: 2, borderRadius: 3, fontWeight: 500 }} clickable onClick={() => navigate('/jobs', { state: { searchTerm: 'Librarian' } })} />
        </Box>
      </Box>

      {/* Top Companies Section */}
      <Box sx={{ maxWidth: '1200px', mx: 'auto', mt: 8, px: 2 }}>
        <Typography variant="h5" align="center" sx={{ fontWeight: 'bold', mb: 4 }}>
          Top institutions hiring now
        </Typography>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {topInstitutions.map((inst: any) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={inst.institutionId}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', cursor: 'pointer', '&:hover': { boxShadow: '0px 4px 15px rgba(0,0,0,0.1)' } }} onClick={() => navigate('/jobs', { state: { companyName: inst.institutionName } })}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{inst.institutionName}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{inst.jobCount} {inst.jobCount === 1 ? 'job' : 'jobs'} available</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box sx={{ width: 40, height: 40, bgcolor: '#f0f0f0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: '#555' }}>
                        {inst.institutionName.substring(0, 3).toUpperCase()}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

    </Box>
  );
}
