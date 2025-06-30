import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default function OTPVerification() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const { session_id, email } = location.state || {};

  useEffect(() => {
    if (!session_id || !email) {
      navigate('/register');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [session_id, email, navigate]);

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    try {
      await api.post('/stockbroker/resend-otp', { session_id, email });
      setCountdown(60);
      setError('');
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.match(/^\d{6}$/)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.post('/stockbroker/verify-otp', {
        session_id,
        otp
      });
      
      navigate('/consent-success', { 
        state: { 
          policies: response.data.policies 
        }
      });
    } catch (err) {
      let errorMessage = 'Failed to verify OTP.';
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
        <h2 className="text-2xl font-bold mb-2 text-center text-blue-800">Verify OTP</h2>
        <p className="text-center text-gray-600 mb-6">
          We've sent a verification code to {email}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
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
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOTP}
              className={`text-blue-600 text-sm hover:text-blue-800 ${countdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={countdown > 0 || loading}
            >
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 