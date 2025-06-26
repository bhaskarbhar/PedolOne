import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-blue-50 py-6 text-center text-gray-600 text-sm mt-12">
      <div className="mb-2">&copy; 2025 SecureVault Inc. All rights reserved.</div>
      <div className="space-x-4">
        <a href="#privacy" className="hover:text-blue-700">Privacy Policy</a>
        <a href="#terms" className="hover:text-blue-700">Terms of Service</a>
        <a href="#security" className="hover:text-blue-700">Security</a>
      </div>
    </footer>
  );
}
