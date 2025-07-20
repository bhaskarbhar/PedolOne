import React, { useEffect, useRef } from 'react';

const SecurityOverlay = ({ children }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    // Removed all security restrictions to allow developer tools access
    console.log('Security restrictions removed - Developer tools are now accessible');
  }, []);

  return (
    <div 
      ref={overlayRef}
      style={{
        position: 'relative',
        minHeight: '100vh'
      }}
    >
      {children}
    </div>
  );
};

export default SecurityOverlay; 