import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-white shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="text-xl sm:text-2xl font-bold text-blue-700">
            PedolOne
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-6">
            <Link to="/" className="text-gray-700 hover:text-blue-700 transition-colors duration-200">
              Home
            </Link>
            <a href="#features" className="text-gray-700 hover:text-blue-700 transition-colors duration-200">
              Features
            </a>
            <a href="#about" className="text-gray-700 hover:text-blue-700 transition-colors duration-200">
              About
            </a>
            <a href="#contact" className="text-gray-700 hover:text-blue-700 transition-colors duration-200">
              Contact
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-700 p-2 rounded-md transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <a
                href="#features"
                className="block px-3 py-2 text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#about"
                className="block px-3 py-2 text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                About
              </a>
              <a
                href="#contact"
                className="block px-3 py-2 text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
