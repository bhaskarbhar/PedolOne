import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md py-4 px-8 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-blue-700">SecureVault</Link>
      <div className="space-x-4">
        <Link to="/" className="text-gray-700 hover:text-blue-700">Home</Link>
        <a href="#features" className="text-gray-700 hover:text-blue-700">Features</a>
        <a href="#about" className="text-gray-700 hover:text-blue-700">About</a>
        <a href="#contact" className="text-gray-700 hover:text-blue-700">Contact</a>
      </div>
    </nav>
  );
}
