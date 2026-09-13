import { Container, Typography, Box, Paper, Divider, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">Home</MuiLink>
        <Typography color="text.primary">Privacy Policy</Typography>
      </Breadcrumbs>

      <Paper elevation={2} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3 }}>
        <Typography variant="h3" component="h1" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
          EduKey360 Privacy Policy
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Effective Date: September 7, 2026 | Last Updated: September 7, 2026
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.7 }}>
          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>1. Introduction</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              EduKey360 (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates <strong>https://edukey360.com</strong> and the EduKey360 mobile applications. 
              We are deeply committed to safeguarding the privacy and security of job candidates, recruiters, educators, and partner institutions. 
              This Privacy Policy explains how we collect, use, disclose, and protect your personal data in compliance with the Digital Personal Data Protection (DPDP) Act, 2023 (India), the General Data Protection Regulation (GDPR), and relevant international data privacy laws.
            </Typography>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>2. Data We Collect</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              We collect information to provide educational recruitment and placement services:
            </Typography>
            <ul>
              <li><strong>Candidate Data:</strong> Full name, verified email address, phone number, location, professional headline, work experience, educational degrees, uploaded resume (PDF/DOCX), candidate demonstration videos, and skills.</li>
              <li><strong>Recruiter &amp; Institution Data:</strong> Organization name, accreditation details, recruiter contact credentials, GST identification, billing address, and job requisition postings.</li>
              <li><strong>Payment &amp; Transaction Details:</strong> Credit purchase transactions, invoice history, and payment gateway tokens processed via PCI-DSS compliant partners (Razorpay). We do not store raw credit card numbers or banking passwords.</li>
              <li><strong>Device &amp; Telemetry Data:</strong> IP addresses, browser user agent, device operating system, session identifiers, and push notification device tokens.</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>3. How We Use Your Data</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Your data is processed strictly for legitimate educational recruitment purposes:
            </Typography>
            <ul>
              <li>Matching candidate profiles and resumes with relevant teaching and faculty openings.</li>
              <li>Automating resume parsing, candidate scoring, and demo video verification to ensure safe and relevant content.</li>
              <li>Facilitating direct communication, interview invitations, calendar scheduling, and hiring feedback between candidates and institutions.</li>
              <li>Security monitoring, brute-force mitigation, account lockout prevention, and platform integrity checks.</li>
              <li>Sending transactional notifications, job alert digests, and verification OTPs.</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>4. Your Rights &amp; Self-Serve Account Deletion</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Under applicable privacy legislation and app store policies, you retain comprehensive rights over your personal data:
            </Typography>
            <ul>
              <li><strong>Right to Access &amp; Portability:</strong> You may review and download your active profile and application records at any time from your candidate or recruiter dashboard.</li>
              <li><strong>Right to Rectification:</strong> You can edit and update inaccurate profile information, resume attachments, or contact details directly in your account settings.</li>
              <li><strong>Right to Erasure (Account Deletion):</strong> In compliance with Google Play Store, Apple App Store, and India DPDP regulations, you can permanently delete your account directly through your Profile Settings (&quot;Delete Account&quot;) or by emailing our Data Protection Officer. Upon deletion, your personal identifiers are immediately anonymized, resumes and demo videos purged, and active login sessions terminated.</li>
              <li><strong>Right to Withdraw Consent:</strong> You may unsubscribe from marketing or job alert emails via one-click unsubscribe links or account preferences.</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>5. Data Security &amp; Storage</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              We implement industry-standard technical and organizational security controls:
            </Typography>
            <ul>
              <li>Transport Layer Security (TLS 1.3) encryption for all web and API communications.</li>
              <li>Argon2/PBKDF2 cryptographic hashing for user authentication credentials.</li>
              <li>Encrypted cloud storage on Microsoft Azure with restricted container access keys for uploaded resumes and documents.</li>
              <li>Automated rate limiting (anti-scraping and anti-credential-stuffing) and security HTTP headers (X-Frame-Options, CSP, HSTS).</li>
            </ul>
          </Box>

          <Box component="section">
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>6. Contact &amp; Grievance Officer</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              If you have questions regarding this Privacy Policy, wish to exercise your data rights, or submit a grievance, please contact our designated Grievance Officer:
            </Typography>
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
              <Typography variant="body2"><strong>Grievance Officer:</strong> EduKey360 Compliance Desk</Typography>
              <Typography variant="body2"><strong>Email:</strong> verification@edukey360.com / jobs@edukey360.com</Typography>
              <Typography variant="body2"><strong>Official Website:</strong> https://edukey360.com</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
