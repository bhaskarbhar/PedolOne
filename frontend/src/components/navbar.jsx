import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/');
  };

  const getDashboardPath = () => {
    if (user?.user_type === 'organization') {
      return '/dashboard/org';
    }
    return '/dashboard/user';
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
          <div className="hidden md:flex items-center space-x-6">
            {!isAuthenticated ? (
              <>
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
                <div className="flex space-x-2">
                  <Link 
                    to="/login/user" 
                    className="px-4 py-2 text-blue-700 hover:text-blue-800 transition-colors duration-200"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/signup/user" 
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200"
                  >
                    Sign Up
                  </Link>
                </div>
              </>
            ) : (
              <>
                <Link to={getDashboardPath()} className="text-gray-700 hover:text-blue-700 transition-colors duration-200">
                  Dashboard
                </Link>
                
                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleProfile}
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-700 transition-colors duration-200 p-2 rounded-lg hover:bg-gray-100"
                  >
                    {user?.user_type === 'organization' ? (
                      <Building2 size={20} />
                    ) : (
                      <User size={20} />
                    )}
                    <span className="font-medium">{user?.username || 'User'}</span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 capitalize">{user?.user_type} Account</p>
                      </div>
                      
                      <Link
                        to={getDashboardPath()}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileOpen(false)}
                      >
                        <User size={16} className="mr-2" />
                        Dashboard
                      </Link>
                      
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Settings size={16} className="mr-2" />
                        Settings
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} className="mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
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
              {!isAuthenticated ? (
                <>
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
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <Link 
                      to="/login/user" 
                      className="block px-3 py-2 text-blue-700 hover:text-blue-800 font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/signup/user" 
                      className="block px-3 py-2 bg-blue-700 text-white rounded-lg mx-3 my-2 text-center hover:bg-blue-800 transition-colors duration-200"
                      onClick={() => setIsOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      {user?.user_type === 'organization' ? (
                        <Building2 size={20} className="text-blue-600" />
                      ) : (
                        <User size={20} className="text-blue-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{user?.full_name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 capitalize">{user?.user_type} Account</p>
                      </div>
                    </div>
                  </div>
                  
                  <Link 
                    to={getDashboardPath()} 
                    className="flex items-center px-3 py-2 text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    <User size={16} className="mr-2" />
                    Dashboard
                  </Link>
                  
                  <button
                    className="flex items-center w-full px-3 py-2 text-gray-700 hover:text-blue-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </button>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
