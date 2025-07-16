import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Phone, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function OrgSignup() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    organizationName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('signup'); // 'signup' | 'success'
  const [passwordStrength, setPasswordStrength] = useState({ label: '', score: 0, color: '#d1d5db' });

  // Password strength calculation function
  function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    let label = 'Weak';
    let color = '#ef4444'; // red
    if (score === 5) {
      label = 'Very Strong';
      color = '#10b981'; // green
    } else if (score >= 4) {
      label = 'Strong';
      color = '#2563eb'; // blue (org theme)
    } else if (score === 3) {
      label = 'Medium';
      color = '#f59e42'; // orange
    }
    return { label, score, color };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    // Basic validation
    const newErrors = {};
    
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.organizationName) newErrors.organizationName = 'Organization name is required';
    if (!formData.email) newErrors.email = 'Business email is required';
    if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const userData = {
        username: formData.username,
        full_name: formData.organizationName,
        email: formData.email,
        phone_number: formData.phoneNumber,
        password: formData.password,
        user_type: 'organization'
      };

      const result = await register(userData, 'organization');
      
      if (result.success) {
        setStep('success');
      } else {
        setErrors({ form: result.error });
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // Password strength update
    if (e.target.name === 'password') {
      setPasswordStrength(getPasswordStrength(e.target.value));
    }

    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
    if (error) clearError();
  };

  if (step === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
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
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <Mail style={{ 
              color: '#2563eb', 
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
              Registration Successful!
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              We've sent a verification email to:
            </p>
            <p style={{ 
              color: '#2563eb', 
              fontSize: '1rem', 
              fontWeight: '500',
              marginBottom: '1rem'
            }}>
              {formData.email}
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Please check your email and click the verification link to activate your organization account.
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate('/login/org')}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Go to Login
            </button>
            
            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '12px',
                fontSize: '1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Building2 style={{ 
            color: '#2563eb', 
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
            Create Organization Account
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Register your organization with PedolOne
          </p>
        </div>

        {(error || errors.form) && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>
              {error || errors.form}
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
          {/* Username Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="username" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="username"
                name="username"
                type="text"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${errors.username ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = errors.username ? '#ef4444' : '#d1d5db'}
              />
              <UserCircle style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
            </div>
            {errors.username && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.username}
              </p>
            )}
          </div>

          {/* Organization Name Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="organizationName" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Organization Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${errors.organizationName ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Enter organization name"
                value={formData.organizationName}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = errors.organizationName ? '#ef4444' : '#d1d5db'}
              />
              <Building2 style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
            </div>
            {errors.organizationName && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.organizationName}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Business Email Address
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
                  border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Enter business email"
                value={formData.email}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db'}
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
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Number Field */}
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="phoneNumber" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${errors.phoneNumber ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = errors.phoneNumber ? '#ef4444' : '#d1d5db'}
              />
              <Phone style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#9ca3af'
              }} />
            </div>
            {errors.phoneNumber && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.phoneNumber}
              </p>
            )}
          </div>

          {/* Password Field */}
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
                  border: `1px solid ${errors.password ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = errors.password ? '#ef4444' : '#d1d5db'}
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
            {/* Password Policy Info Box */}
            <div style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              fontSize: '0.95rem',
              color: '#374151'
            }}>
              <strong>Password must contain:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
                <li>At least 8 characters</li>
                <li>At least one uppercase letter (A-Z)</li>
                <li>At least one lowercase letter (a-z)</li>
                <li>At least one digit (0-9)</li>
                <li>At least one special character (e.g., !@#$%^&*)</li>
              </ul>
            </div>
            {/* Password Strength Bar */}
            {formData.password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{
                  height: '8px',
                  width: '100%',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '0.25rem'
                }}>
                  <div style={{
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    height: '100%',
                    background: passwordStrength.color,
                    transition: 'width 0.3s'
                  }} />
                </div>
                <span style={{
                  fontSize: '0.85rem',
                  color: passwordStrength.color,
                  fontWeight: '500'
                }}>{passwordStrength.label}</span>
              </div>
            )}
            {errors.password && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="confirmPassword" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: `1px solid ${errors.confirmPassword ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#d1d5db'}
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
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#9ca3af' : '#2563eb',
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
              {loading ? 'Creating Account...' : 'Create Organization Account'}
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280' }}>Already have an account? </span>
              <button
                type="button"
                onClick={() => navigate('/login/org')}
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontWeight: '500',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign in
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
            For individuals, please use the{' '}
            <button
              onClick={() => navigate('/signup/user')}
              style={{
                color: '#2563eb',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Individual Registration
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
