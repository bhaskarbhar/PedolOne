import React from 'react';

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  style = {},
  ...props 
}) {
  // Base styles that will work even without Tailwind
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: 'none',
    textDecoration: 'none',
    fontFamily: 'inherit',
    outline: 'none',
    userSelect: 'none',
    ...style
  };

  const variants = {
    primary: {
      backgroundColor: '#2563eb',
      color: 'white',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '12px 24px' : '10px 16px',
      fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
      minHeight: size === 'sm' ? '36px' : size === 'lg' ? '48px' : '44px',
    },
    secondary: {
      backgroundColor: '#e5e7eb',
      color: '#374151',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '12px 24px' : '10px 16px',
      fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
      minHeight: size === 'sm' ? '36px' : size === 'lg' ? '48px' : '44px',
    },
    outline: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '12px 24px' : '10px 16px',
      fontSize: size === 'sm' ? '14px' : size === 'lg' ? '18px' : '16px',
      minHeight: size === 'sm' ? '36px' : size === 'lg' ? '48px' : '44px',
    },
  };

  const finalStyle = {
    ...baseStyle,
    ...variants[variant],
  };

  const handleMouseEnter = (e) => {
    if (variant === 'primary') {
      e.target.style.backgroundColor = '#1d4ed8';
    } else if (variant === 'secondary') {
      e.target.style.backgroundColor = '#d1d5db';
    } else if (variant === 'outline') {
      e.target.style.backgroundColor = '#f9fafb';
    }
  };

  const handleMouseLeave = (e) => {
    if (variant === 'primary') {
      e.target.style.backgroundColor = '#2563eb';
    } else if (variant === 'secondary') {
      e.target.style.backgroundColor = '#e5e7eb';
    } else if (variant === 'outline') {
      e.target.style.backgroundColor = 'white';
    }
  };

  return (
    <button 
      style={finalStyle}
      className={`${className}`}
      onClick={onClick} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
} 