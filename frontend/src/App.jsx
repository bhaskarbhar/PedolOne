import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import OrgLogin from './pages/OrgLogin';
import UserLogin from './pages/UserLogin';
import Navbar from './components/navbar';
import Footer from './components/footer';

function App() {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      <main className="flex-grow w-full">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login/org" element={<OrgLogin />} />
          <Route path="/login/user" element={<UserLogin />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
