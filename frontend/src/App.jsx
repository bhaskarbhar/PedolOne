import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import OrgLogin from './pages/OrgLogin';
import UserLogin from './pages/UserLogin';
import UserDashboard from './pages/UserDashboard';
import OrgDashboard from './pages/OrgDashboard';
import UserSignup from './pages/UserSignup';
import OrgSignup from './pages/OrgSignup';
import VerificationSuccess from './pages/VerificationSuccess';
import Navbar from './components/navbar';
import Footer from './components/footer';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col w-full">
        <Navbar />
        <main className="flex-grow w-full">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login/org" element={<OrgLogin />} />
            <Route path="/login/user" element={<UserLogin />} />
            <Route path="/signup/user" element={<UserSignup />} />
            <Route path="/signup/org" element={<OrgSignup />} />
            <Route path="/dashboard/user" element={<UserDashboard />} />
            <Route path="/dashboard/org" element={<OrgDashboard />} />
            <Route path="/verification-success" element={<VerificationSuccess />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
