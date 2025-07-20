import React, { useState, useMemo } from 'react';
import { Shield, Clock, Eye, Globe, CheckCircle, Database, Users, Building2, Filter, Search, Calendar, Download } from 'lucide-react';

const AuditLogTable = ({ logs }) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLogType, setSelectedLogType] = useState('all');
  const [selectedDataSource, setSelectedDataSource] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Get unique log types and data sources for filter options
  const logTypes = useMemo(() => {
    const types = [...new Set(logs.map(log => log.type))];
    return types.sort();
  }, [logs]);

  const dataSources = useMemo(() => {
    const sources = [...new Set(logs.map(log => log.dataSource))];
    return sources.sort();
  }, [logs]);

  // Filter logs based on current filter criteria
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          log.fintechName?.toLowerCase().includes(searchLower) ||
          log.dataAccessed?.toLowerCase().includes(searchLower) ||
          log.purpose?.toLowerCase().includes(searchLower) ||
          log.ipAddress?.toLowerCase().includes(searchLower) ||
          log.region?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Log type filter
      if (selectedLogType !== 'all' && log.type !== selectedLogType) {
        return false;
      }

      // Data source filter
      if (selectedDataSource !== 'all' && log.dataSource !== selectedDataSource) {
        return false;
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const logDate = new Date(log.date);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;

        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedLogType, selectedDataSource, dateRange]);

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
      case 'bulk_data_csv_created':
        return <Database size={14} className="text-orange-500" />;
      case 'bulk_data_csv_export':
        return <Download size={14} className="text-indigo-500" />;
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
      case 'bulk_data_csv_created':
        return 'Bulk CSV Created';
      case 'bulk_data_csv_export':
        return 'Bulk CSV Exported';
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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLogType('all');
    setSelectedDataSource('all');
    setDateRange({ start: '', end: '' });
  };

  const exportFilteredLogs = () => {
    const csvContent = [
      ['Date & Time', 'Type', 'Data Source', 'Fintech Name', 'Data Accessed', 'Purpose', 'IP Address', 'Location'],
      ...filteredLogs.map(log => [
        log.date,
        getLogTypeLabel(log.type),
        getDataSourceLabel(log.dataSource),
        log.fintechName,
        log.dataAccessed,
        log.purpose,
        log.ipAddress,
        log.region || 'Unknown Location'
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="secure-card" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
      {/* Header with filters */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
            Audit Logs ({filteredLogs.length} of {logs.length})
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: showFilters ? '#3b82f6' : 'rgba(59, 130, 246, 0.1)',
                color: showFilters ? 'white' : '#3b82f6',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              onClick={exportFilteredLogs}
              disabled={filteredLogs.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: filteredLogs.length === 0 ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by fintech name, data accessed, purpose, IP address, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'rgba(255, 255, 255, 0.9)'
            }}
          />
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{
            background: 'rgba(248, 250, 252, 0.8)',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Log Type Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Log Type
                </label>
                <select
                  value={selectedLogType}
                  onChange={(e) => setSelectedLogType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Types</option>
                  {logTypes.map(type => (
                    <option key={type} value={type}>
                      {getLogTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Source Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Data Source
                </label>
                <select
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Sources</option>
                  {dataSources.map(source => (
                    <option key={source} value={source}>
                      {getDataSourceLabel(source)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                />
              </div>
            </div>

            {/* Clear filters button */}
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto' }}>
        <table className="secure-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Date & Time
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Type
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Data Source
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Fintech Name
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Data Accessed
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Purpose
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                IP Address
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontWeight: '600', color: '#374151' }}>
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {logs.length === 0 ? 'No audit logs found.' : 'No logs match the current filters.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, index) => (
                <tr key={index} style={{ 
                  borderBottom: '1px solid rgba(243, 244, 246, 0.8)',
                  transition: 'background-color 0.2s ease'
                }} className="hover:bg-gray-50">
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#374151' }}>
                      <Clock size={14} style={{ marginRight: '0.5rem', color: '#9ca3af' }} />
                      {log.date}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {getLogTypeIcon(log.type)}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                        {getLogTypeLabel(log.type)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {getDataSourceIcon(log.dataSource)}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                        {getDataSourceLabel(log.dataSource)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                      {log.fintechName}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Shield size={14} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                      <span style={{ fontSize: '0.875rem', color: '#374151' }}>{log.dataAccessed}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.purpose}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                      <Globe size={14} style={{ marginRight: '0.5rem', color: '#9ca3af' }} />
                      {log.ipAddress}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                      <Globe size={14} style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                      {log.region || 'Unknown Location'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogTable; 