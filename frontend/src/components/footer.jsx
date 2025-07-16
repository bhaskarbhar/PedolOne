import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-blue-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 w-full">
      <div className="max-w-7xl mx-auto text-center">
        <div className="text-gray-600 text-sm sm:text-base mb-3 sm:mb-2">
          &copy; 2025 PedolOne Inc. All rights reserved.
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-center space-y-2 sm:space-y-0 sm:space-x-6">
          <Link to="/privacy" className="text-gray-600 hover:text-blue-700 text-sm sm:text-base transition-colors duration-200">
            Privacy Policy
          </Link>
          <Link to="/terms" className="text-gray-600 hover:text-blue-700 text-sm sm:text-base transition-colors duration-200">
            Terms of Service
          </Link>
          <Link to="/security" className="text-gray-600 hover:text-blue-700 text-sm sm:text-base transition-colors duration-200">
            Security
          </Link>
          <Link to="/policy" className="text-gray-600 hover:text-blue-700 text-sm sm:text-base transition-colors duration-200">
            Data Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
