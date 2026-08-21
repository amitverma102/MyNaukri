import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import VerifyOtp from './components/VerifyOtp';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import JobsList from './components/JobsList';
import CandidateDashboard from './components/CandidateDashboard';
import CandidateProfile from './components/CandidateProfile';
import SavedJobs from './components/candidate/SavedJobs';
import ApplicationStatus from './components/candidate/ApplicationStatus';
import InterviewInvites from './components/candidate/InterviewInvites';
import RecruiterDashboard from './components/RecruiterDashboard';
import RecruiterProfile from './components/RecruiterProfile';
import AdminDashboard from './components/AdminDashboard';
import AdminProfile from './components/AdminProfile';
import EduTechDashboard from './components/EduTechDashboard';
import InstituteAdminDashboard from './components/InstituteAdminDashboard';
import RecruiterManagement from './components/instituteadmin/RecruiterManagement';
import SuperAdminDashboard from './components/superadmin/SuperAdminDashboard';
import InstitutionList from './components/superadmin/InstitutionList';
import CreditTransactionTable from './components/superadmin/CreditTransactionTable';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import AboutUs from './components/info/AboutUs';
import Careers from './components/info/Careers';
import EmployerHome from './components/info/EmployerHome';
import Sitemap from './components/info/Sitemap';
import Credits from './components/info/Credits';
import HelpCenter from './components/info/HelpCenter';
import SummonsNotices from './components/info/SummonsNotices';
import Grievances from './components/info/Grievances';
import ReportIssue from './components/info/ReportIssue';
import PrivacyPolicy from './components/info/PrivacyPolicy';
import TermsConditions from './components/info/TermsConditions';
import FraudAlert from './components/info/FraudAlert';
import TrustSafety from './components/info/TrustSafety';
import './App.css';


function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
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
    <Footer />
    </Box>
  );
}

export default App;
