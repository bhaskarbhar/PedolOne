import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import OTPVerification from '../components/OTPVerification';

export default function UserLogin() {
  const navigate = useNavigate();
  const { login, verifyLogin, loading, error, clearError, isAuthenticated, user } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [loginEmail, setLoginEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.user_type === 'organization') {
        navigate('/dashboard/org');
      } else {
        navigate('/dashboard/user');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const result = await login(formData.email, formData.password);
    
    if (result.success && result.requiresOtp) {
      setLoginEmail(formData.email);
      setStep('otp');
    }
  };

  const handleOTPVerify = async (otp) => {
    setOtpLoading(true);
    try {
      const result = await verifyLogin(loginEmail, otp);
      
      if (result.success) {
        // Redirect based on user type
        if (result.user.user_type === 'organization') {
          navigate('/dashboard/org');
        } else {
          navigate('/dashboard/user');
        }
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setLoginEmail('');
    setOtpLoading(false);
    clearError();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) clearError();
  };

  if (step === 'otp') {
    return (
      <OTPVerification
        email={loginEmail}
        onVerify={handleOTPVerify}
        onBack={handleBackToLogin}
        loading={otpLoading}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #ecfdf5, #d1fae5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <User style={{ 
            color: '#059669', 
            width: '48px', 
            height: '48px', 
            margin: '0 auto 1rem' 
          }} />
          <h2 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Individual Login
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Sign in to your personal account
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
              {error}
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                name="email"
                type="email"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <Mail style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type="password"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <Lock style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '8px',
                  accentColor: '#10b981'
                }}
              />
              <label htmlFor="remember-me" style={{ color: '#111827' }}>
                Remember me
              </label>
            </div>

            <div>
              <a href="#" style={{
                color: '#10b981',
                textDecoration: 'none',
                fontWeight: '500'
              }}>
                Forgot password?
              </a>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#9ca3af' : '#10b981',
                color: 'white',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280' }}>Don't have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/signup/user')}
                style={{
                  color: '#10b981',
                  textDecoration: 'none',
                  fontWeight: '500',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign up
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            >
              Back to Home
            </button>
          </div>
        </form>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            For organizations, please use the{' '}
            <button
              onClick={() => navigate('/login/org')}
              style={{
                color: '#10b981',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Organization Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 