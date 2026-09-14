import { Box, Container, Grid, Typography, Link, Divider, Stack, IconButton, Tooltip } from '@mui/material';
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
            <Box sx={{ display: 'flex', gap: 1.5, mt: 2, alignItems: 'center' }}>
              <Tooltip title="Facebook (Unavailable)">
                <span>
                  <IconButton disabled size="small" sx={{ p: 0.5, color: 'text.disabled', opacity: 0.38 }} aria-label="Facebook (disabled)">
                    <FacebookIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Instagram (Unavailable)">
                <span>
                  <IconButton disabled size="small" sx={{ p: 0.5, color: 'text.disabled', opacity: 0.38 }} aria-label="Instagram (disabled)">
                    <InstagramIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="X (Unavailable)">
                <span>
                  <IconButton disabled size="small" sx={{ p: 0.5, color: 'text.disabled', opacity: 0.38 }} aria-label="X (disabled)">
                    <TwitterIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Follow EduKey360 on LinkedIn">
                <IconButton 
                  component="a" 
                  href="https://linkedin.com/company/edu360" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  color="inherit" 
                  size="small" 
                  sx={{ p: 0.5, '&:hover': { color: '#0077b5' } }}
                  aria-label="Follow EduKey360 on LinkedIn"
                >
                  <LinkedInIcon />
                </IconButton>
              </Tooltip>
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
