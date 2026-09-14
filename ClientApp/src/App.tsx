import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import VerifyOtp from './components/VerifyOtp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import EduBotChat from './components/ai/EduBotChat';
import './App.css';

// Lazy-loaded route components for optimal production bundle splitting
const InstitutionShowcase = lazy(() => import('./components/InstitutionShowcase'));
const JobsList = lazy(() => import('./components/JobsList'));
const CandidateDashboard = lazy(() => import('./components/CandidateDashboard'));
const CandidateProfile = lazy(() => import('./components/CandidateProfile'));
const SavedJobs = lazy(() => import('./components/candidate/SavedJobs'));
const ApplicationStatus = lazy(() => import('./components/candidate/ApplicationStatus'));
const InterviewInvites = lazy(() => import('./components/candidate/InterviewInvites'));
const RecruiterDashboard = lazy(() => import('./components/RecruiterDashboard'));
const RecruiterProfile = lazy(() => import('./components/RecruiterProfile'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminProfile = lazy(() => import('./components/AdminProfile'));
const EduTechDashboard = lazy(() => import('./components/EduTechDashboard'));
const InstituteAdminDashboard = lazy(() => import('./components/InstituteAdminDashboard'));
const RecruiterManagement = lazy(() => import('./components/instituteadmin/RecruiterManagement'));
const SuperAdminDashboard = lazy(() => import('./components/superadmin/SuperAdminDashboard'));
const InstitutionList = lazy(() => import('./components/superadmin/InstitutionList'));
const CreditTransactionTable = lazy(() => import('./components/superadmin/CreditTransactionTable'));
const AboutUs = lazy(() => import('./components/info/AboutUs'));
const Careers = lazy(() => import('./components/info/Careers'));
const EmployerHome = lazy(() => import('./components/info/EmployerHome'));
const Sitemap = lazy(() => import('./components/info/Sitemap'));
const Credits = lazy(() => import('./components/info/Credits'));
const HelpCenter = lazy(() => import('./components/info/HelpCenter'));
const SummonsNotices = lazy(() => import('./components/info/SummonsNotices'));
const Grievances = lazy(() => import('./components/info/Grievances'));
const ReportIssue = lazy(() => import('./components/info/ReportIssue'));
const PrivacyPolicy = lazy(() => import('./components/info/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./components/info/TermsConditions'));
const FraudAlert = lazy(() => import('./components/info/FraudAlert'));
const TrustSafety = lazy(() => import('./components/info/TrustSafety'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress size={40} thickness={4} />
  </Box>
);

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        
          {/* Candidate Routes */}
          <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
          <Route path="/candidate/profile" element={<CandidateProfile />} />
          <Route path="/candidate/saved-jobs" element={<SavedJobs />} />
          <Route path="/candidate/applications" element={<ApplicationStatus />} />
          <Route path="/candidate/interviews" element={<InterviewInvites />} />
          
          {/* Recruiter Routes */}
          <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
          <Route path="/recruiter/profile" element={<RecruiterProfile />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/edutechadmin/dashboard" element={<EduTechDashboard />} />
          <Route path="/instituteadmin/dashboard" element={<InstituteAdminDashboard />} />
          <Route path="/instituteadmin/recruiters" element={<RecruiterManagement />} />
          
          {/* SuperAdmin Routes */}
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/superadmin/institutions" element={<InstitutionList />} />
          <Route path="/superadmin/credit-transactions" element={<CreditTransactionTable />} />
          
          {/* Legacy/Common Routes */}
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/institution/:id" element={<InstitutionShowcase />} />
          
          {/* Info Pages */}
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/employer-home" element={<EmployerHome />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/summons-notices" element={<SummonsNotices />} />
          <Route path="/grievances" element={<Grievances />} />
          <Route path="/report-issue" element={<ReportIssue />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/fraud-alert" element={<FraudAlert />} />
          <Route path="/trust-safety" element={<TrustSafety />} />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      <Footer />
      <EduBotChat />
    </Box>
  );
}

export default App;
