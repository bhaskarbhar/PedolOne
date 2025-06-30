import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [pan, setPan] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateEmail = async () => {
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/check-email', { email });
      if (response.data.exists) {
        setStep(2);
        return true;
      } else {
        setError('Email not found. Please register with PedolOne first.');
        return false;
      }
    } catch (err) {
      setError('Failed to verify email. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    await validateEmail();
  };

  const validatePII = () => {
    if (!aadhaar.match(/^[0-9]{12}$/)) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return false;
    }
    if (!pan.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
      setError('Please enter a valid PAN number.');
      return false;
    }
    if (!consent) {
      setError('You must provide consent to continue.');
      return false;
    }
    return true;
  };

  const handlePIISubmit = async (e) => {
    e.preventDefault();
    if (!validatePII()) return;

    setError('');
    setLoading(true);
    
    try {
      const response = await api.post('/stockbroker/consent', {
        email,
        aadhaar,
        pan,
        consent
      });
      
      navigate('/otp', { 
        state: { 
          session_id: response.data.session_id,
          email 
        }
      });
    } catch (err) {
      let errorMessage = 'Failed to verify PII data.';
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Stock Broker Logo" className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-800">Open Your Account</h2>
        
        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              className={`w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePIISubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter 12-digit Aadhaar number"
                maxLength={12}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter PAN number"
                maxLength={10}
                required
                disabled={loading}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label className="ml-2 block text-sm text-gray-700">
                I consent to share my KYC details for account opening
              </label>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="space-y-2">
              <button
                type="submit"
                className={`w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Proceed to OTP'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition"
                disabled={loading}
              >
                Back to Email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 