import React, { useState, useEffect } from 'react';
import { Shield, Mail } from 'lucide-react';

const OTPVerification = ({ email, onVerify, onBack, loading = false }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting || loading) {
      return;
    }
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setError('');
    setIsSubmitting(true);
    
    try {
      await onVerify(otp);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 6) {
      setOtp(value);
      setError('');
    }
    // Remove any automatic submission logic here
  };

  const isDisabled = loading || isSubmitting || otp.length !== 6 || timeLeft === 0;
  const buttonText = loading || isSubmitting ? 'Verifying...' : 'Verify & Login';

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
          <Shield style={{ 
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
            Verify Your Login
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            We've sent a 6-digit verification code to
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}>
            <Mail size={16} style={{ marginRight: '0.5rem', color: '#6b7280' }} />
            <span style={{ fontWeight: '500' }}>{email}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="otp" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Verification Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength="6"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '8px',
                fontSize: '1.25rem',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                fontFamily: 'monospace'
              }}
              placeholder="000000"
              value={otp}
              onChange={handleOtpChange}
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = error ? '#ef4444' : '#d1d5db'}
              disabled={loading || isSubmitting}
            />
            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ 
            textAlign: 'center', 
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            {timeLeft > 0 ? (
              <span style={{ color: '#6b7280' }}>
                Code expires in: <span style={{ fontWeight: '500', color: '#059669' }}>
                  {formatTime(timeLeft)}
                </span>
              </span>
            ) : (
              <span style={{ color: '#ef4444' }}>
                Code expired. Please try again.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              disabled={isDisabled}
              style={{
                width: '100%',
                backgroundColor: isDisabled ? '#9ca3af' : '#10b981',
                color: 'white',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {buttonText}
            </button>
            
            <button
              type="button"
              onClick={onBack}
              disabled={loading || isSubmitting}
              style={{
                width: '100%',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                cursor: loading || isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: loading || isSubmitting ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!loading && !isSubmitting) {
                  e.target.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (!loading && !isSubmitting) {
                  e.target.style.backgroundColor = 'white';
                }
              }}
            >
              Back to Login
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
          <p>Didn't receive the code? Check your spam folder or contact support.</p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
