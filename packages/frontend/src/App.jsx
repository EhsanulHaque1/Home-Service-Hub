import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Homepage from '@/components/Homepage';
import Footer from '@/components/Footer';
import SignIn from '@/pages/SignIn';
import Register from '@/pages/Register';
import ReportWorker from '@/pages/ReportWorker';
import BrowseTasks from '@/pages/BrowseTasks';
import Workers from '@/pages/Workers';
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Chat from '@/pages/Chat';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Feedback from '@/pages/Feedback';
import AdminPanel from '@/pages/AdminPanel';
import { useAuth } from '@/context/AuthContext';

function HomeLayout() {
  return (
    <>
      <Navbar />
      <Homepage />
      <Footer />
    </>
  );
}

function AdminRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="mt-16 text-center text-slate-400">Loading…</div>;
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <AdminPanel onBack={() => navigate('/')} />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <Routes>
        <Route path="/" element={<HomeLayout />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/report-worker" element={<ReportWorker />} />
        <Route path="/tasks" element={<BrowseTasks />} />
        <Route path="/workers" element={<Workers />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/adminpanel" element={<AdminRoute />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  );
}
