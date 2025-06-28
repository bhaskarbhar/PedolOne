import React from 'react';
import { Lock, Unlock } from 'lucide-react';

const MaskedDataCard = ({ label, maskedValue, isUnlockable = true }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600 mb-1 block">
            {label}
          </label>
          <p className="text-lg font-mono text-gray-900 tracking-wider">
            {maskedValue}
          </p>
        </div>
        {isUnlockable && (
          <button 
            className="ml-4 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            title="Request to unmask data"
          >
            <Lock size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MaskedDataCard;