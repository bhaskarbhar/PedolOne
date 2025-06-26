import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import OrgLogin from './pages/OrgLogin';
import UserLogin from './pages/UserLogin';
import Navbar from './components/navbar';
import Footer from './components/footer';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/org" element={<OrgLogin />} />
          <Route path="/login/user" element={<UserLogin />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

export default App;
