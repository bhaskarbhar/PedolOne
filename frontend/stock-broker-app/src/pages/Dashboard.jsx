import React from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function Dashboard() {
  const location = useLocation();
  const { username } = location.state || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center">
      <header className="w-full bg-blue-800 py-4 shadow-md mb-8">
        <h1 className="text-center text-3xl text-white font-bold tracking-wide">StockBrokerX Dashboard</h1>
      </header>
      <div className="bg-white p-8 rounded shadow-md w-full max-w-lg text-center flex flex-col items-center">
        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="User" className="w-20 h-20 mb-4 rounded-full border-4 border-blue-200" />
        <h2 className="text-2xl font-bold mb-2 text-blue-800">Welcome, {username || 'User'}!</h2>
        <div className="mb-4 text-blue-700">Consent Status: <span className="font-semibold text-green-600">Active</span></div>
        <div className="mb-8 text-blue-700">Your account is KYC verified and ready for trading.</div>
        <Link to="/" className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Logout</Link>
      </div>
    </div>
  );
} 