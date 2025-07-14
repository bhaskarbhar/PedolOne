import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Users, FileText, Shield, Database, Activity, Calendar, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, Download
} from 'lucide-react';
import axios from 'axios';
import AuditLogTable from '../components/AuditLogTable';

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
  const [contractId, setContractId] = useState("");
  const [contractError, setContractError] = useState("");
  const [orgIdInput, setOrgIdInput] = useState("");
  const [orgIdConfirmed, setOrgIdConfirmed] = useState(false);

  // Always declare orgIdToUse before any useEffect or logic that uses it
  const orgIdToUse = orgIdConfirmed ? orgIdInput : (orgInfo?.org_id || user?.organization_id);

  useEffect(() => {
    // If user is org admin but has no org_id, skip auto-fetch
    if (!user || (user.user_type === 'organization' && !user.organization_id && !orgInfo)) {
      setLoading(false);
      return;
    }
    if (!user || !user.organization_id) {
      setError("User not associated with any organization");
      setLoading(false);
      return;
    }
    
    const fetchOrgData = async () => {
      try {
        setError(null);
        const orgId = orgIdToUse;
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
        const logsResponse = await api.get(`/policy/org-dashboard/${orgIdToUse}/logs`);
        const logsArr = Array.isArray(logsResponse.data) ? logsResponse.data : [];
        const logs = logsArr.map(log => ({
          id: log._id || log.log_id,
          date: new Date(log.created_at).toLocaleString(),
          type: log.log_type || 'consent',
          dataSource: log.data_source || 'individual',
          fintechName: log.fintechName || log.fintech_name || 'Unknown',
          fintechId: log.fintechId || log.fintech_id || '',
          dataAccessed: log.resource_name?.charAt(0).toUpperCase() + log.resource_name?.slice(1),
          purpose: Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose,
          ipAddress: log.ip_address || 'N/A'
        }));
        setAuditLogs(logs);
        
        // Fetch data categories
        const categoriesResponse = await api.get(`/policy/org-dashboard/${orgIdToUse}/data_categories`);
        setDataCategories(categoriesResponse.data.data_categories || []);
        
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
  }, [orgIdToUse]);

  // Handler for contract_id input
  const handleContractIdSubmit = async (e) => {
    e.preventDefault();
    setContractError("");
    setLoading(true);
    try {
      const api = createAxiosInstance();
      const res = await api.get(`/organization/list`);
      const orgs = res.data.organizations || [];
      const found = orgs.find(o => o.contract_id === contractId);
      if (found) {
        setOrgInfo(found);
        setContractError("");
      } else {
        setContractError("No organization found with this contract ID.");
      }
    } catch (err) {
      setContractError("Error fetching organization by contract ID.");
    }
    setLoading(false);
  };

  // Handler for organization_id input
  const handleOrgIdSubmit = async (e) => {
    e.preventDefault();
    if (orgIdInput.trim() === orgInfo?.org_id) {
      // Update user's organization_id in the backend
      try {
        const api = createAxiosInstance();
        await api.post(`/auth/update-organization-id`, {
          user_id: user.userid,
          organization_id: orgIdInput.trim()
        });
        setOrgIdConfirmed(true);
        setContractError("");
      } catch (err) {
        setContractError("Failed to update organization ID in user profile.");
      }
    } else {
      setContractError("Organization ID does not match the contract. Please try again.");
    }
  };

  // If org admin and no org_id and no orgInfo, show contract_id input
  if (user && user.user_type === 'organization' && !user.organization_id && !orgInfo) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleContractIdSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px #0001', minWidth: 320 }}>
          <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Enter Contract ID</h2>
          <input
            type="text"
            value={contractId}
            onChange={e => setContractId(e.target.value)}
            placeholder="Enter contract ID"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '1rem' }}
            required
          />
          <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 500 }}>Submit</button>
          {contractError && <div style={{ color: '#dc2626', marginTop: '1rem' }}>{contractError}</div>}
        </form>
      </div>
    );
  }

  // If contract found but org_id not confirmed, prompt for org_id
  if (user && user.user_type === 'organization' && !user.organization_id && orgInfo && !orgIdConfirmed) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleOrgIdSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px #0001', minWidth: 320 }}>
          <h2 style={{ marginBottom: '1rem', color: '#111827' }}>Enter Organization ID</h2>
          <input
            type="text"
            value={orgIdInput}
            onChange={e => setOrgIdInput(e.target.value)}
            placeholder="Enter organization ID"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '4px', marginBottom: '1rem' }}
            required
          />
          <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 500 }}>Submit</button>
          {contractError && <div style={{ color: '#dc2626', marginTop: '1rem' }}>{contractError}</div>}
        </form>
      </div>
    );
  }

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

  // Remove Contracts and Compliance from the tabs array
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'users', label: 'User Management', icon: <Users size={16} /> },
    { id: 'data_requests', label: 'Data Requests', icon: <FileText size={16} /> },
    { id: 'audit_logs', label: 'Audit Logs', icon: <Database size={16} /> },
    { id: 'data_categories', label: 'Data Categories', icon: <Database size={16} /> },
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
                  <AuditLogTable logs={auditLogs} />
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
          {activeTab === 'audit_logs' && (
              <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Audit Logs</h2>
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(auditLogs) || auditLogs.length === 0 ? (
                  <div style={{ color: '#d97706' }}>No audit logs found for this organization.</div>
                ) : (
                  <AuditLogTable logs={auditLogs} />
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
        </div>
      </div>
    </div>
  );
}
