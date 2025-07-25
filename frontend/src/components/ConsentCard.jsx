import React from 'react';
import { Eye, X, Calendar } from 'lucide-react';

const ConsentCard = ({ fintechName, dataTypes, purpose, validTill, status = 'active' }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {fintechName}
          </h3>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <span className="font-medium">Data Shared:</span>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {dataTypes}
            </span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {status}
        </span>
      </div>
      
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Purpose:</span> {purpose}
        </p>
        <div className="flex items-center text-sm text-gray-600 mt-1">
          <Calendar size={14} className="mr-1" />
          <span className="font-medium">Valid till:</span>
          <span className="ml-1">{validTill}</span>
        </div>
      </div>


    </div>
  );
};

export default ConsentCard; 