import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Users, FileText, Shield, Database, Activity, Calendar, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, Download
} from 'lucide-react';
import axios from 'axios';

// Create axios instance with auth token
const createAxiosInstance = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

export default function OrgDashboard() {
  const { user } = useAuth();
  // State for organization info
  const [orgInfo, setOrgInfo] = useState(null);
  // State for users managed by this org
  const [orgUsers, setOrgUsers] = useState([]);
  // State for data access requests
  const [dataRequests, setDataRequests] = useState([]);
  // State for inter-org contracts
  const [contracts, setContracts] = useState([]);
  // State for audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  // State for data categories
  const [dataCategories, setDataCategories] = useState([]);
  // State for compliance metrics
  const [complianceMetrics, setComplianceMetrics] = useState([]);
  // State for active tab
  const [activeTab, setActiveTab] = useState('overview');
  // WebSocket ref
  const ws = useRef(null);
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !user.organization_id) {
      setError("User not associated with any organization");
      setLoading(false);
      return;
    }
    
    const fetchOrgData = async () => {
      try {
        setError(null);
        const orgId = user.organization_id;
        const api = createAxiosInstance();
        
        console.log('Fetching data for organization:', orgId);
        
        // Fetch organization info
        const orgResponse = await api.get(`/organization/${orgId}`);
        setOrgInfo(orgResponse.data);
        
        // Fetch users managed by this org
        const usersResponse = await api.get(`/organization/${orgId}/users`);
        setOrgUsers(usersResponse.data || []);
        
        // Fetch data access requests
        const requestsResponse = await api.get(`/data-requests/org/${orgId}`);
        setDataRequests(requestsResponse.data || []);
        
        // Fetch inter-org contracts
        const contractsResponse = await api.get(`/inter-org-contracts/org/${orgId}`);
        setContracts(contractsResponse.data || []);
        
        // Fetch audit logs
        const logsResponse = await api.get(`/audit/org/${orgId}`);
        console.log('Audit logs response:', logsResponse.data);
        setAuditLogs(logsResponse.data || []);
        
        // Fetch data categories
        const categoriesResponse = await api.get(`/policy/org/${orgId}/data_categories`);
        setDataCategories(categoriesResponse.data || []);
        
        // Fetch compliance metrics
        const complianceResponse = await api.get(`/policy/compliance/org/${orgId}`);
        setComplianceMetrics(complianceResponse.data || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching organization data:', err);
        setError('Failed to load organization data. Please try again later.');
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [user]);

  // Add handlers for approve/reject
  const handleApproveRequest = async (requestId) => {
    const response_message = prompt('Optional: Add a response message for approval');
    try {
      const api = createAxiosInstance();
      await api.post('/data-requests/respond', {
        request_id: requestId,
        status: 'approved',
        response_message
      });
      // Refresh data
      window.location.reload();
    } catch (err) {
      alert('Failed to approve request.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const response_message = prompt('Optional: Add a response message for rejection');
    try {
      const api = createAxiosInstance();
      await api.post('/data-requests/respond', {
        request_id: requestId,
        status: 'rejected',
        response_message
      });
      // Refresh data
      window.location.reload();
    } catch (err) {
      alert('Failed to reject request.');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'users', label: 'User Management', icon: <Users size={16} /> },
    { id: 'data_requests', label: 'Data Requests', icon: <FileText size={16} /> },
    { id: 'contracts', label: 'Contracts', icon: <Shield size={16} /> },
    { id: 'audit_logs', label: 'Audit Logs', icon: <Database size={16} /> },
    { id: 'data_categories', label: 'Data Categories', icon: <Database size={16} /> },
    { id: 'compliance', label: 'Compliance', icon: <TrendingUp size={16} /> },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading organization data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#dc2626', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️ Error</div>
          <div>{error}</div>
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Please make sure you're logged in as an organization user.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', margin: 0, marginBottom: '0.5rem' }}>
                Welcome to your Organization Dashboard, {user?.username}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} />
                Organization ID: <span style={{ fontWeight: '500' }}>{user?.organization_id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
          {/* Tab Navigation */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 2rem 0 2rem' }}>
        <div style={{ borderBottom: '1px solid #e5e7eb', display: 'flex', backgroundColor: '#f9fafb' }}>
          {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '1rem 1.5rem',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                  color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {/* Tab Content */}
          <div style={{ padding: '2rem' }}>
            {activeTab === 'overview' && (
              <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Organization Overview</h2>
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ color: '#2563eb', fontWeight: '600', marginBottom: '0.5rem' }}>{orgInfo?.org_name || 'Organization'}</h3>
                  <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>Org ID: {orgInfo?.org_id}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>Contract ID: {orgInfo?.contract_id}</div>
                </div>
                <div style={{ flex: 2, display: 'flex', gap: '1.5rem' }}>
                  <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{orgUsers.length}</div>
                    <div style={{ color: '#6b7280' }}>Users</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>{dataRequests.length}</div>
                    <div style={{ color: '#6b7280' }}>Data Requests</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#059669' }}>{contracts.length}</div>
                    <div style={{ color: '#6b7280' }}>Contracts</div>
                  </div>
                </div>
              </div>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Recent Audit Activity</h3>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {auditLogs.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No recent audit logs.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>User ID</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Fintech Name</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Resource</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Purpose</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Type</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>IP Address</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Data Source</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(auditLogs) ? auditLogs.slice(0, 10).map((log, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.user_id}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.fintech_name}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.resource_name}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.log_type}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.ip_address}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.data_source}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.created_at}</td>
                        </tr>
                      )) : null}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === 'users' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>User Management</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(orgUsers) || orgUsers.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No users found for this organization.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>User ID</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Username</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Full Name</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Email</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Phone</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Shared Resources</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Active Policies</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Last Consent</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Total Data Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUsers.map((u, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.user_id}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.username}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.full_name}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.email}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.phone_number}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.shared_resources?.join(', ')}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.active_policies_count}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.last_consent_date}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{u.total_data_access_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === 'data_requests' && (
                        <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Data Access Requests</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(dataRequests) || dataRequests.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No data access requests found for this organization.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Request ID</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Requester Org</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Target User</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Resources</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Purpose</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Retention</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Status</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Created At</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Expires At</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataRequests.map((req, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.request_id}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.requester_org_name}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.target_user_email}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{Array.isArray(req.requested_resources) ? req.requested_resources.join(', ') : req.requested_resources}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{Array.isArray(req.purpose) ? req.purpose.join(', ') : req.purpose}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.retention_window}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.status}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.created_at}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{req.expires_at}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>
                            {req.status === 'pending' ? (
                              <>
                                <button style={{ marginRight: 8, background: '#059669', color: 'white', border: 'none', borderRadius: 4, padding: '0.25rem 0.75rem', cursor: 'pointer' }}
                                  onClick={() => handleApproveRequest(req.request_id)}>
                                  Approve
                                </button>
                                <button style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, padding: '0.25rem 0.75rem', cursor: 'pointer' }}
                                  onClick={() => handleRejectRequest(req.request_id)}>
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span style={{ color: req.status === 'approved' ? '#059669' : req.status === 'rejected' ? '#dc2626' : '#6b7280' }}>{req.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                        </div>
                      </div>
          )}
          {activeTab === 'contracts' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Inter-Organization Contracts</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(contracts) || contracts.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No inter-organization contracts found for this organization.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Contract ID</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Source Org</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Target Org</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Type</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Resources</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Purposes</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Retention</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Data Flow</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Status</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Created At</th>
                        <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Expires At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.contract_id}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.source_org_name}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.target_org_name}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.contract_type}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{Array.isArray(contract.allowed_resources) ? contract.allowed_resources.join(', ') : contract.allowed_resources}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{Array.isArray(contract.purposes) ? contract.purposes.join(', ') : contract.purposes}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.retention_window}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.data_flow_direction}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>
                      <span style={{
                              padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                              backgroundColor: contract.status === 'active' ? '#ecfdf5' : contract.status === 'expired' ? '#fef3c7' : '#fee2e2',
                              color: contract.status === 'active' ? '#059669' : contract.status === 'expired' ? '#d97706' : '#dc2626'
                      }}>
                              {contract.status}
                      </span>
                          </td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.created_at}</td>
                          <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{contract.expires_at}</td>
                        </tr>
                  ))}
                    </tbody>
                  </table>
                )}
              </div>
              </div>
            )}
          {activeTab === 'audit_logs' && (
              <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Audit Logs</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(auditLogs) || auditLogs.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No audit logs found for this organization.</div>
                ) : (
                  <>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search by user ID, fintech name, or resource..."
                        style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '4px', flex: 1 }}
                        onChange={(e) => {
                          const searchTerm = e.target.value.toLowerCase();
                          if (!Array.isArray(auditLogs)) return;
                          const filtered = auditLogs.filter(log => 
                            log.user_id.toString().includes(searchTerm) ||
                            log.fintech_name.toLowerCase().includes(searchTerm) ||
                            log.resource_name.toLowerCase().includes(searchTerm)
                          );
                          setAuditLogs(filtered);
                        }}
                      />
                      <select
                        style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        onChange={(e) => {
                          const filterType = e.target.value;
                          if (filterType === 'all') {
                            // Reset to original data
                            axios.get(`/audit/org/${user?.organization_id}`)
                              .then(res => setAuditLogs(res.data || []))
                              .catch(() => setAuditLogs([]));
                          } else {
                            if (!Array.isArray(auditLogs)) return;
                            const filtered = auditLogs.filter(log => log.log_type === filterType);
                            setAuditLogs(filtered);
                          }
                        }}
                      >
                        <option value="all">All Types</option>
                        <option value="consent">Consent</option>
                        <option value="data_access">Data Access</option>
                      </select>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>User ID</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Fintech Name</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Resource</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Purpose</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Type</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>IP Address</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Data Source</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Source Org</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Target Org</th>
                          <th style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.user_id}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.fintech_name}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.resource_name}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                backgroundColor: log.log_type === 'consent' ? '#ecfdf5' : '#eff6ff',
                                color: log.log_type === 'consent' ? '#059669' : '#2563eb'
                              }}>
                                {log.log_type}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.ip_address || 'N/A'}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.data_source}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.source_org_id || 'N/A'}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.target_org_id || 'N/A'}</td>
                            <td style={{ padding: '0.5rem', border: '1px solid #e5e7eb' }}>{log.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
              </div>
            )}
          {activeTab === 'data_categories' && (
              <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Data Categories</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(dataCategories) || dataCategories.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No data categories found for this organization.</div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dataCategories.map((category, index) => (
                    <div key={index} style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {category.name}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {category.unique_users} users ({category.percentage}%)
                        </span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${category.percentage}%`,
                          height: '100%',
                          backgroundColor: '#2563eb',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                  </div>
                )}
                </div>
              </div>
            )}
          {activeTab === 'compliance' && (
              <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Compliance Metrics</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(complianceMetrics) || complianceMetrics.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No compliance metrics available for this organization.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {complianceMetrics.map((metric, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>
                          {metric.metric}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontWeight: '600',
                            color: metric.status === 'good' ? '#059669' : metric.status === 'warning' ? '#d97706' : metric.status === 'excellent' ? '#059669' : '#6b7280'
                          }}>
                            {metric.value}
                          </span>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: metric.status === 'good' ? '#059669' : metric.status === 'warning' ? '#d97706' : metric.status === 'excellent' ? '#059669' : '#6b7280'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
