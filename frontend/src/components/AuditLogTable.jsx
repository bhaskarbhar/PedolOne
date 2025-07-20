import React from 'react';
import { Shield, Clock, Eye, Globe, CheckCircle, Database, Users, Building2 } from 'lucide-react';

const AuditLogTable = ({ logs }) => {
  const getLogTypeIcon = (logType) => {
    switch (logType) {
      case 'consent':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'data_access':
        return <Eye size={14} className="text-blue-500" />;
      case 'user_login':
        return <Users size={14} className="text-purple-500" />;
      case 'contract_creation':
        return <Building2 size={14} className="text-blue-500" />;
      case 'contract_request_approved':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'contract_request_rejected':
        return <Shield size={14} className="text-red-500" />;
      case 'data_request_sent':
        return <Eye size={14} className="text-blue-500" />;
      case 'data_request_approved':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'data_request_rejected':
        return <Shield size={14} className="text-red-500" />;
      default:
        return <Database size={14} className="text-gray-500" />;
    }
  };

  const getLogTypeLabel = (logType) => {
    switch (logType) {
      case 'consent':
        return 'Consent Granted';
      case 'data_access':
        return 'Data Accessed';
      case 'user_login':
        return 'User Login';
      case 'contract_creation':
        return 'Contract Created';
      case 'contract_request_approved':
        return 'Contract Approved';
      case 'contract_request_rejected':
        return 'Contract Rejected';
      case 'data_request_sent':
        return 'Data Request Sent';
      case 'data_request_approved':
        return 'Data Request Approved';
      case 'data_request_rejected':
        return 'Data Request Rejected';
      default:
        return logType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getDataSourceIcon = (dataSource) => {
    switch (dataSource) {
      case 'individual':
        return <Users size={14} className="text-purple-500" />;
      case 'organization':
        return <Building2 size={14} className="text-orange-500" />;
      default:
        return <Database size={14} className="text-gray-500" />;
    }
  };

  const getDataSourceLabel = (dataSource) => {
    switch (dataSource) {
      case 'individual':
        return 'Individual User';
      case 'organization':
        return 'Organization';
      default:
        return dataSource;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fintech Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Accessed
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purpose
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Clock size={14} className="mr-2 text-gray-400" />
                    {log.date}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {getLogTypeIcon(log.type)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {getLogTypeLabel(log.type)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {getDataSourceIcon(log.dataSource)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {getDataSourceLabel(log.dataSource)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {log.fintechName}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <Shield size={14} className="mr-2 text-blue-500" />
                    <span className="text-sm text-gray-900">{log.dataAccessed}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {log.purpose}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe size={14} className="mr-2 text-gray-400" />
                    {log.ipAddress}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe size={14} className="mr-2 text-blue-400" />
                    {log.region || 'Unknown Location'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogTable; 