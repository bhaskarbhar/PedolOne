import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, ArrowRight, Home, Building2, User } from 'lucide-react';

export default function VerificationSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Do not auto-redirect, let user choose login type
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGoToUserLogin = () => {
    navigate('/login/user');
  };

  const handleGoToOrgLogin = () => {
    navigate('/login/org');
  };

  const handleGoHome = () => {
    navigate('/');
  };

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
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '3rem 2rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        {/* Success Icon */}
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <CheckCircle style={{ 
            color: '#10b981', 
            width: '80px', 
            height: '80px'
          }} />
        </div>

        {/* Success Message */}
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '1rem'
        }}>
          Email Verified Successfully!
        </h1>

        <p style={{
          color: '#6b7280',
          fontSize: '1.125rem',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Your email address has been verified successfully. You can now log in to your account.
        </p>

        {/* Email Display */}
        {email && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '2rem',
            fontSize: '1rem'
          }}>
            <Mail size={20} style={{ marginRight: '0.75rem', color: '#6b7280' }} />
            <span style={{ fontWeight: '500' }}>{email}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '1.5rem'
        }}>
          <button
            onClick={handleGoToUserLogin}
            style={{
              width: '100%',
              backgroundColor: '#10b981',
              color: 'white',
              padding: '14px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#059669'}
            onMouseOut={e => e.target.style.backgroundColor = '#10b981'}
          >
            <User size={20} />
            Go to Individual Login
            <ArrowRight size={20} />
          </button>
          <button
            onClick={handleGoToOrgLogin}
            style={{
              width: '100%',
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '14px 20px',
              fontSize: '1rem',
              fontWeight: '500',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={e => e.target.style.backgroundColor = '#2563eb'}
          >
            <Building2 size={20} />
            Go to Organization Login
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Home Button */}
        <button
          onClick={handleGoHome}
          style={{
            width: '100%',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            padding: '14px 20px',
            fontSize: '1rem',
            fontWeight: '500',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={e => {
            e.target.style.backgroundColor = '#f9fafb';
            e.target.style.borderColor = '#9ca3af';
          }}
          onMouseOut={e => {
            e.target.style.backgroundColor = 'white';
            e.target.style.borderColor = '#d1d5db';
          }}
        >
          <Home size={20} />
          Back to Home
        </button>
      </div>
    </div>
  );
} 