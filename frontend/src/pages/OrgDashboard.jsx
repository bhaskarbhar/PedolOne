import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Users, FileText, Shield, Database, Activity, Calendar, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, Download, Plus, X
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

  // New state for create data request modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createRequestLoading, setCreateRequestLoading] = useState(false);
  const [createRequestError, setCreateRequestError] = useState("");
  const [availableOrganizations, setAvailableOrganizations] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableResources, setAvailableResources] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  
  // Form data for create request
  const [requestForm, setRequestForm] = useState({
    target_org_id: "",
    target_user_email: "",
    requested_resources: [],
    purpose: [],
    retention_window: "30 days",
    request_message: ""
  });

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
      console.error('Error approving request:', err);
      alert('Failed to approve request: ' + (err.response?.data?.detail || err.message));
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
      console.error('Error rejecting request:', err);
      alert('Failed to reject request: ' + (err.response?.data?.detail || err.message));
    }
  };



  // Fetch available organizations and resources for data requests
  const fetchAvailableOrganizations = async () => {
    try {
      const api = createAxiosInstance();
      const response = await api.get('/organization/list/organizations');
      const allOrgs = response.data.organizations || [];
      // Filter out the current organization
      const filteredOrgs = allOrgs.filter(org => org.org_id !== orgIdToUse);
      setAvailableOrganizations(filteredOrgs);
    } catch (err) {
      console.error('Error fetching available organizations:', err);
    }
  };

  const fetchUsersByOrganization = async (orgId) => {
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/organization/${orgId}/all-users`);
      const users = response.data.users || [];
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error fetching users for organization:', err);
      setAvailableUsers([]);
    }
  };

  const fetchAvailableResources = async () => {
    try {
      const api = createAxiosInstance();
      const response = await api.get('/policy/org-dashboard/' + orgIdToUse + '/data_categories');
      const categories = response.data.data_categories || [];
      const resources = categories.map(cat => cat.name);
      // Add common PII types as fallback
      const commonResources = ['email', 'phone', 'address', 'ssn', 'bank_account', 'credit_card', 'aadhaar', 'pan'];
      const allResources = [...new Set([...resources, ...commonResources])];
      setAvailableResources(allResources);
    } catch (err) {
      console.error('Error fetching available resources:', err);
      // Fallback to common PII types
      setAvailableResources(['email', 'phone', 'address', 'ssn', 'bank_account', 'credit_card', 'aadhaar', 'pan']);
    }
  };

  // Handle create data request modal
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setCreateRequestError("");
    setSelectedOrgId("");
    setRequestForm({
      target_org_id: "",
      target_user_email: "",
      requested_resources: [],
      purpose: [],
      retention_window: "30 days",
      request_message: ""
    });
    await fetchAvailableOrganizations();
    await fetchAvailableResources();
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setCreateRequestError("");
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setCreateRequestLoading(true);
    setCreateRequestError("");

    // Validate form data
    if (!requestForm.target_user_email) {
      setCreateRequestError("Please select a target user");
      setCreateRequestLoading(false);
      return;
    }
    if (requestForm.requested_resources.length === 0) {
      setCreateRequestError("Please select at least one resource");
      setCreateRequestLoading(false);
      return;
    }
    if (requestForm.purpose.length === 0) {
      setCreateRequestError("Please select at least one purpose");
      setCreateRequestLoading(false);
      return;
    }

    try {
      const api = createAxiosInstance();
      await api.post('/data-requests/send-request', requestForm);
      
      // Close modal and refresh data
      setShowCreateModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error creating data request:', err);
      setCreateRequestError(err.response?.data?.detail || 'Failed to create data request');
    } finally {
      setCreateRequestLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setRequestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleResourceToggle = (resource) => {
    setRequestForm(prev => ({
      ...prev,
      requested_resources: prev.requested_resources.includes(resource)
        ? prev.requested_resources.filter(r => r !== resource)
        : [...prev.requested_resources, resource]
    }));
  };

  const handlePurposeToggle = (purpose) => {
    setRequestForm(prev => ({
      ...prev,
      purpose: prev.purpose.includes(purpose)
        ? prev.purpose.filter(p => p !== purpose)
        : [...prev.purpose, purpose]
    }));
  };

  const handleOrganizationChange = async (orgId) => {
    setSelectedOrgId(orgId);
    setRequestForm(prev => ({
      ...prev,
      target_org_id: orgId,
      target_user_email: "" // Reset user selection when org changes
    }));
    
    if (orgId) {
      await fetchUsersByOrganization(orgId);
    } else {
      setAvailableUsers([]);
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Data Access Requests</h2>
                <button
                  onClick={handleOpenCreateModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  <Plus size={16} />
                  Create Request
                </button>
              </div>
              
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(dataRequests) || dataRequests.length === 0 ? (
                  <div style={{ color: '#d97706', textAlign: 'center', padding: '2rem' }}>
                    <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div>No data access requests found for this organization.</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Click "Create Request" to send a new data access request to a user.
                    </div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Request ID</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Organization</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Target User</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Resources</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Purpose</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Retention</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Created</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Expires</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataRequests.map((req, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: req.is_requester ? '#dbeafe' : '#fef3c7',
                              color: req.is_requester ? '#1e40af' : '#d97706'
                            }}>
                              {req.is_requester ? 'Sent' : 'Received'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                              {req.request_id?.substring(0, 8)}...
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            {req.is_requester ? req.target_org_name : req.requester_org_name}
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{req.target_user_email}</td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {Array.isArray(req.requested_resources) ? req.requested_resources.map((resource, i) => (
                                <span key={i} style={{
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500'
                                }}>
                                  {resource}
                                </span>
                              )) : (
                                <span style={{
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500'
                                }}>
                                  {req.requested_resources}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                            {Array.isArray(req.purpose) ? req.purpose.join(', ') : req.purpose}
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{req.retention_window}</td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: req.status === 'approved' ? '#dcfce7' : 
                                         req.status === 'rejected' ? '#fee2e2' : 
                                         req.status === 'expired' ? '#fef3c7' : '#dbeafe',
                              color: req.status === 'approved' ? '#166534' : 
                                     req.status === 'rejected' ? '#dc2626' : 
                                     req.status === 'expired' ? '#d97706' : '#1e40af'
                            }}>
                              {req.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            {new Date(req.expires_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                            {req.status === 'pending' && !req.is_requester ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                  style={{ 
                                    background: '#059669', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    padding: '0.5rem 0.75rem', 
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                  }}
                                  onClick={() => handleApproveRequest(req.request_id)}
                                >
                                  Approve
                                </button>
                                <button 
                                  style={{ 
                                    background: '#dc2626', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    padding: '0.5rem 0.75rem', 
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                  }}
                                  onClick={() => handleRejectRequest(req.request_id)}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ 
                                color: req.status === 'approved' ? '#059669' : 
                                       req.status === 'rejected' ? '#dc2626' : '#6b7280',
                                fontSize: '0.875rem'
                              }}>
                                {req.is_requester ? (
                                  <span style={{ fontStyle: 'italic', color: '#6b7280' }}>
                                    {req.status === 'pending' ? 'Waiting for response...' : req.status}
                                  </span>
                                ) : (
                                  req.status
                                )}
                              </span>
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

      {/* Create Data Request Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Create Data Access Request</h2>
              <button
                onClick={handleCloseCreateModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {createRequestError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {createRequestError}
              </div>
            )}

            <form onSubmit={handleCreateRequest}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Organization *
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select an organization...</option>
                  {availableOrganizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.org_id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target User *
                </label>
                <select
                  value={requestForm.target_user_email}
                  onChange={(e) => handleFormChange('target_user_email', e.target.value)}
                  required
                  disabled={!selectedOrgId}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    backgroundColor: !selectedOrgId ? '#f9fafb' : 'white'
                  }}
                >
                  <option value="">
                    {!selectedOrgId ? 'Please select an organization first...' : 'Select a user...'}
                  </option>
                  {availableUsers.map((user) => (
                    <option key={user.user_id} value={user.email}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Requested Resources *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availableResources.map((resource) => (
                    <button
                      key={resource}
                      type="button"
                      onClick={() => handleResourceToggle(resource)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: requestForm.requested_resources.includes(resource) 
                          ? '2px solid #2563eb' 
                          : '2px solid #e5e7eb',
                        borderRadius: '20px',
                        background: requestForm.requested_resources.includes(resource) 
                          ? '#dbeafe' 
                          : 'white',
                        color: requestForm.requested_resources.includes(resource) 
                          ? '#1e40af' 
                          : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      {resource}
                    </button>
                  ))}
                </div>
                {requestForm.requested_resources.length === 0 && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Please select at least one resource
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Purpose *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['KYC', 'Credit Assessment', 'Fraud Prevention', 'Compliance', 'Service Provision', 'Analytics'].map((purpose) => (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => handlePurposeToggle(purpose)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: requestForm.purpose.includes(purpose) 
                          ? '2px solid #2563eb' 
                          : '2px solid #e5e7eb',
                        borderRadius: '20px',
                        background: requestForm.purpose.includes(purpose) 
                          ? '#dbeafe' 
                          : 'white',
                        color: requestForm.purpose.includes(purpose) 
                          ? '#1e40af' 
                          : '#374151',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      {purpose}
                    </button>
                  ))}
                </div>
                {requestForm.purpose.length === 0 && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Please select at least one purpose
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Retention Window
                </label>
                <select
                  value={requestForm.retention_window}
                  onChange={(e) => handleFormChange('retention_window', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="7 days">7 days</option>
                  <option value="30 days">30 days</option>
                  <option value="90 days">90 days</option>
                  <option value="1 year">1 year</option>
                  <option value="2 years">2 years</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Request Message (Optional)
                </label>
                <textarea
                  value={requestForm.request_message}
                  onChange={(e) => handleFormChange('request_message', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Add a personal message to the user explaining why you need their data..."
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRequestLoading || !requestForm.target_org_id || !requestForm.target_user_email || requestForm.requested_resources.length === 0 || requestForm.purpose.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: createRequestLoading || !requestForm.target_org_id || !requestForm.target_user_email || requestForm.requested_resources.length === 0 || requestForm.purpose.length === 0 
                      ? '#9ca3af' 
                      : '#2563eb',
                    color: 'white',
                    cursor: createRequestLoading || !requestForm.target_org_id || !requestForm.target_user_email || requestForm.requested_resources.length === 0 || requestForm.purpose.length === 0 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {createRequestLoading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
