import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConsentSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-blue-800">Verification Successful!</h2>
        <p className="text-gray-600 mb-6">
          Your KYC details have been successfully verified. You can now proceed to login with your email.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Proceed to Login
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
} 