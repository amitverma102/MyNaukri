import { Box, Container, Grid, Typography, Link, Divider, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter'; // Using Twitter icon for X
import LinkedInIcon from '@mui/icons-material/LinkedIn';

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', py: 6, mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ justifyContent: 'space-between' }}>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <img 
              src="/logo.jpg" 
              alt="EduKey360" 
              style={{ height: '40px', objectFit: 'contain', marginBottom: '8px' }} 
            />
            <Typography variant="body2" color="text.secondary">
              Connect with us
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Link href="https://facebook.com/edu360" target="_blank" color="inherit" aria-label="Follow EduKey360 on Facebook">
                <FacebookIcon />
              </Link>
              <Link href="https://instagram.com/edu360" target="_blank" color="inherit" aria-label="Follow EduKey360 on Instagram">
                <InstagramIcon />
              </Link>
              <Link href="https://twitter.com/edu360" target="_blank" color="inherit" aria-label="Follow EduKey360 on X">
                <TwitterIcon />
              </Link>
              <Link href="https://linkedin.com/company/edu360" target="_blank" color="inherit" aria-label="Follow EduKey360 on LinkedIn">
                <LinkedInIcon />
              </Link>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Stack spacing={2}>
              <Link component={RouterLink} to="/about-us" color="text.secondary" variant="body2" sx={{ display: 'block' }}>About us</Link>
              <Link component={RouterLink} to="/careers" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Careers</Link>
              <Link component={RouterLink} to="/employer-home" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Employer home</Link>
              <Link component={RouterLink} to="/sitemap" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Sitemap</Link>
              <Link component={RouterLink} to="/credits" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Credits</Link>
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Stack spacing={2}>
              <Link component={RouterLink} to="/help-center" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Help center</Link>
              <Link component={RouterLink} to="/summons-notices" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Summons/Notices</Link>
              <Link component={RouterLink} to="/grievances" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Grievances</Link>
              <Link component={RouterLink} to="/report-issue" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Report issue</Link>
            </Stack>
          </Grid>

          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Stack spacing={2}>
              <Link component={RouterLink} to="/privacy-policy" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Privacy policy</Link>
              <Link component={RouterLink} to="/terms-conditions" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Terms & conditions</Link>
              <Link component={RouterLink} to="/fraud-alert" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Fraud alert</Link>
              <Link component={RouterLink} to="/trust-safety" color="text.secondary" variant="body2" sx={{ display: 'block' }}>Trust & safety</Link>
            </Stack>
          </Grid>

        </Grid>

        <Divider sx={{ my: 4 }} />

        <Typography variant="body2" color="text.secondary" align="center">
          {'© '}
          {new Date().getFullYear()}
          {' EduKey360. All rights reserved.'}
        </Typography>
      </Container>
    </Box>
  );
}
