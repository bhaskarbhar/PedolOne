import React, { useEffect, useRef } from 'react';

const SecurityOverlay = ({ children }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    const preventScreenshots = () => {
      // Additional screenshot prevention measures
      const preventCopy = (e) => {
        e.preventDefault();
        return false;
      };

      const preventContextMenu = (e) => {
        e.preventDefault();
        return false;
      };

      const preventKeyboardShortcuts = (e) => {
        // Prevent common screenshot shortcuts
        if (
          (e.ctrlKey || e.metaKey) && 
          (e.key === 'c' || e.key === 's' || e.key === 'p' || e.key === 'u')
        ) {
          e.preventDefault();
          return false;
        }

        // Prevent Print Screen key
        if (e.key === 'PrintScreen' || e.keyCode === 44) {
          e.preventDefault();
          return false;
        }

        // Prevent F12 and other developer tools shortcuts
        if (
          e.key === 'F12' || 
          e.keyCode === 123 ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J'))
        ) {
          e.preventDefault();
          return false;
        }
      };

      const preventDrag = (e) => {
        e.preventDefault();
        return false;
      };

      const preventSelection = (e) => {
        if (!e.target.matches('input, textarea, [contenteditable="true"], .allow-select')) {
          e.preventDefault();
          return false;
        }
      };

      // Add event listeners
      document.addEventListener('copy', preventCopy);
      document.addEventListener('cut', preventCopy);
      document.addEventListener('contextmenu', preventContextMenu);
      document.addEventListener('keydown', preventKeyboardShortcuts);
      document.addEventListener('dragstart', preventDrag);
      document.addEventListener('selectstart', preventSelection);

      // Prevent iframe embedding
      if (window.self !== window.top) {
        window.top.location = window.self.location;
      }

      // Disable console access
      const disableConsole = () => {
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.info = () => {};
        console.debug = () => {};
      };

      disableConsole();

      // Detect developer tools
      const detectDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
          // Show security warning instead of completely blocking
          const warning = document.createElement('div');
          warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 1rem;
            text-align: center;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          `;
          warning.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span>⚠️</span>
              <span>Security Alert: Developer tools detected. Please close them for enhanced security.</span>
            </div>
          `;
          document.body.appendChild(warning);
          
          // Remove warning after 5 seconds
          setTimeout(() => {
            if (warning.parentNode) {
              warning.parentNode.removeChild(warning);
            }
          }, 5000);
        }
      };

      // Check for developer tools periodically
      const devToolsInterval = setInterval(detectDevTools, 2000);

      // Cleanup function
      return () => {
        document.removeEventListener('copy', preventCopy);
        document.removeEventListener('cut', preventCopy);
        document.removeEventListener('contextmenu', preventContextMenu);
        document.removeEventListener('keydown', preventKeyboardShortcuts);
        document.removeEventListener('dragstart', preventDrag);
        document.removeEventListener('selectstart', preventSelection);
        clearInterval(devToolsInterval);
      };
    };

    const cleanup = preventScreenshots();
    return cleanup;
  }, []);

  return (
    <div 
      ref={overlayRef}
      style={{
        position: 'relative',
        minHeight: '100vh',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onSelectStart={(e) => {
        if (!e.target.matches('input, textarea, [contenteditable="true"], .allow-select')) {
          e.preventDefault();
        }
      }}
    >
      {children}
      
      {/* Security watermark overlay */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'rgba(0, 0, 0, 0.02)',
          pointerEvents: 'none',
          zIndex: 1,
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
      >
        PEDOLONE SECURE SESSION
      </div>
    </div>
  );
};

export default SecurityOverlay; 