import { Container, Typography, Box, Paper, Divider, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export default function TermsConditions() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">Home</MuiLink>
        <Typography color="text.primary">Terms &amp; Conditions</Typography>
      </Breadcrumbs>

      <Paper elevation={2} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3 }}>
        <Typography variant="h3" component="h1" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
          EduKey360 Terms of Service
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Effective Date: September 7, 2026 | Last Updated: September 7, 2026
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.7 }}>
          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>1. Acceptance of Terms</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              By accessing or using the EduKey360 website (https://edukey360.com), API services, or mobile applications, you agree to be legally bound by these Terms of Service. If you do not agree to these terms, you must discontinue platform usage immediately.
            </Typography>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>2. Eligibility &amp; User Accounts</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Candidates must be at least 18 years of age. Institutional users and recruiters warrant that they have the legal authority to represent their respective educational establishments and post legitimate job opportunities.
            </Typography>
            <ul>
              <li>You are responsible for maintaining confidentiality of your authentication credentials.</li>
              <li>You must provide accurate, current, and verifiable information during registration.</li>
              <li>Simultaneous logins for recruiters and administrators are restricted by active session management to prevent account sharing and unauthorized access.</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>3. Platform Conduct &amp; Prohibited Activities</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              EduKey360 maintains a strict zero-tolerance policy against fraudulent activities:
            </Typography>
            <ul>
              <li><strong>Candidate Demo Videos:</strong> Any video submitted must be authentic teaching, lecturing, or educational demonstration content. Uploading vulgar, copyrighted, defamatory, or non-educational content will result in immediate ban and profile deletion.</li>
              <li><strong>Job Postings:</strong> Recruiters shall not charge candidates application fees or engage in misleading recruitment schemes.</li>
              <li><strong>Prohibited Scraping:</strong> Automated web scraping, data extraction bots, or vulnerability exploits directed at the platform are strictly prohibited.</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>4. Credits, Billing, &amp; Refund Policy</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Institutions purchase platform credits via Razorpay for job postings and candidate unlocks:
            </Typography>
            <ul>
              <li>Platform credits are valid for twelve (12) months from date of purchase unless otherwise specified in an institutional service agreement.</li>
              <li>Credits consumed for valid unlocks or job publications are non-refundable. In cases of duplicate charges or billing errors, refund requests submitted within 7 business days to jobs@edukey360.com will be processed following standard review.</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>5. Account Termination &amp; Self-Serve Deletion</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              You may terminate your account at any time via the self-serve &quot;Delete Account&quot; feature available in your profile settings. Upon confirmation, your data will be permanently anonymized and login capabilities deactivated. EduKey360 reserves the right to suspend or terminate accounts that breach platform safety, community standards, or these terms.
            </Typography>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>6. Governing Law &amp; Jurisdiction</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in New Delhi, India.
            </Typography>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>7. Contact Information</Typography>
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
              <Typography variant="body2"><strong>Support Desk:</strong> jobs@edukey360.com</Typography>
              <Typography variant="body2"><strong>Verification Desk:</strong> verification@edukey360.com</Typography>
              <Typography variant="body2"><strong>Official Domain:</strong> https://edukey360.com</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
