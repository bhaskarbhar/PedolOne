import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Hardcoded credentials for demo
    if (username === 'demo' && password === 'password123') {
      setError('');
      navigate('/dashboard', { state: { username } });
    } else {
      setError('Invalid username or password. Try demo / password123');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md flex flex-col items-center">
        <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Stock Broker Logo" className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold mb-6 text-blue-800">StockBrokerX Login</h2>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label className="block mb-1 text-blue-700">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded" required />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-blue-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" required />
          </div>
          {error && <div className="mb-4 text-red-600">{error}</div>}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Login</button>
        </form>
      </div>
    </div>
  );
} 