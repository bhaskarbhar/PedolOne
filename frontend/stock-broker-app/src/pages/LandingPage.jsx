import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex flex-col items-center justify-center">
      <div className="bg-white p-10 rounded shadow-lg flex flex-col items-center max-w-xl w-full">
        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Stock Broker Logo" className="w-20 h-20 mb-4" />
        <h1 className="text-4xl font-extrabold mb-2 text-blue-900 tracking-tight">StockBrokerX</h1>
        <p className="mb-6 text-lg text-blue-700 text-center">India's most trusted platform for seamless stock trading and digital KYC onboarding. Start your investment journey today!</p>
        <div className="flex gap-4 w-full justify-center">
          <Link to="/register" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold">Open Account</Link>
          <Link to="/login" className="px-6 py-2 bg-white border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition font-semibold">Login</Link>
        </div>
      </div>
      <footer className="mt-10 text-blue-700 text-sm">&copy; {new Date().getFullYear()} StockBrokerX. All rights reserved.</footer>
    </div>
  );
} 