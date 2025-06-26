import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building, Mail, Lock } from 'lucide-react';

export default function OrgLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    orgCode: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle organization login logic here
    console.log('Org login:', formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Building style={{ 
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
            Organization Login
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Sign in to your organization account
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="orgCode" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Organization Code
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="orgCode"
                name="orgCode"
                type="text"
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
                placeholder="Enter organization code"
                value={formData.orgCode}
                onChange={handleChange}
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
              <Building style={{
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
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
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
                onFocus={(e) => e.target.style.borderColor = '#2563eb'}
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
            justifyContent: 'flex-end',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}>
            <a href="#" style={{
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              Forgot your password?
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button
              type="submit"
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
              Sign In to Organization
            </Button>
            
            <Button
              type="button"
              variant="outline"
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
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 