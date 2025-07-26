import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Users, FileText, Shield, Database, Activity, Calendar, Settings, TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, Download, Plus, X, Edit, Trash2, History, Search, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import AuditLogTable from '../components/AuditLogTable';

// Create axios instance with auth token
const createAxiosInstance = () => {
  const token = localStorage.getItem('token');
  console.log('DEBUG: Creating axios instance with token:', token ? `${token.substring(0, 20)}...` : 'null');
  console.log('DEBUG: Full token:', token);
  
  if (!token) {
    console.error('DEBUG: No token found in localStorage!');
    console.error('DEBUG: localStorage contents:', Object.keys(localStorage));
    console.error('DEBUG: localStorage.getItem("token"):', localStorage.getItem('token'));
  }
  
  const instance = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Add request interceptor to log all requests
  instance.interceptors.request.use(
    (config) => {
      console.log('DEBUG: Axios request interceptor - URL:', config.url);
      console.log('DEBUG: Axios request interceptor - Headers:', config.headers);
      return config;
    },
    (error) => {
      console.error('DEBUG: Axios request interceptor error:', error);
      return Promise.reject(error);
    }
  );
  
  console.log('DEBUG: Axios instance headers:', instance.defaults.headers);
  return instance;
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
  const [sentContracts, setSentContracts] = useState([]);
  const [receivedContracts, setReceivedContracts] = useState([]);
  const [contractStats, setContractStats] = useState({
    total_sent: 0,
    total_received: 0,
    pending_sent: 0,
    pending_received: 0,
    active_sent: 0,
    active_received: 0,
    rejected_sent: 0,
    rejected_received: 0
  });
  // State for audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsPagination, setAuditLogsPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  });
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
  const [allOrganizations, setAllOrganizations] = useState([]);
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

  // Contract state
  const [showCreateContractModal, setShowCreateContractModal] = useState(false);
  const [createContractLoading, setCreateContractLoading] = useState(false);
  const [createContractError, setCreateContractError] = useState("");
  const [contractForm, setContractForm] = useState({
    target_org_id: "",
    contract_name: "",
    contract_type: "data_sharing",
    contract_description: "",
    resources_allowed: [],
    approval_message: ""
  });

  // User management state
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userFilterStatus, setUserFilterStatus] = useState("all");
  const [userFilterResource, setUserFilterResource] = useState("all");
  const [showUserPIIModal, setShowUserPIIModal] = useState(false);
  const [selectedUserPII, setSelectedUserPII] = useState(null);
  const [userPIILoading, setUserPIILoading] = useState(false);
  
  // Contract management state
  const [showEditContractModal, setShowEditContractModal] = useState(false);
  const [showDeleteContractModal, setShowDeleteContractModal] = useState(false);
  const [showContractVersionsModal, setShowContractVersionsModal] = useState(false);
  const [showContractAuditModal, setShowContractAuditModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractVersions, setContractVersions] = useState([]);
  const [contractAuditLogs, setContractAuditLogs] = useState([]);
  const [contractTypes, setContractTypes] = useState([]);
  
  // Contract edit form state
  const [editContractForm, setEditContractForm] = useState({
    contract_name: "",
    contract_description: "",
    contract_type: "data_sharing",
    resources_allowed: [],
    approval_message: ""
  });
  
  // PDF viewer modal state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  // Alerts state
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [alertsPagination, setAlertsPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });
  const [alertsFilters, setAlertsFilters] = useState({
    alert_type: "",
    severity: "",
    is_read: null
  });
  
  // Alerts popup state
  const [showAlertsPopup, setShowAlertsPopup] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  
  // IP blocking state
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [blockingIP, setBlockingIP] = useState(false);
  
  // Contract deletion form state
  const [deleteContractForm, setDeleteContractForm] = useState({
    deletion_reason: "",
    approval_message: ""
  });
  
  // Contract action state
  const [contractActionLoading, setContractActionLoading] = useState(false);
  const [contractActionError, setContractActionError] = useState("");
  
  // Contract resource form state
  const [contractResourceForm, setContractResourceForm] = useState({
    resource_name: "",
    purpose: [],
    retention_window: "30 days"
  });
  
  // Available resources for contracts
  const [availableContractResources] = useState([
    "aadhaar", "pan", "account", "ifsc", "creditcard", "debitcard", 
    "gst", "itform16", "upi", "passport", "drivinglicense", "file_sharing"
  ]);
  
  const [availablePurposes] = useState([
    "KYC verification", "Identity validation", "Account opening", "Tax compliance", 
    "Income verification", "Loan processing", "Account verification", "Loan disbursement",
    "Transaction processing", "Bank branch verification", "Fund transfer routing",
    "NEFT/RTGS processing", "Credit profiling", "Fraud risk analysis", "Credit limit assessment",
    "Spending analysis", "Account validation", "Transaction monitoring", "Business KYC",
    "Financial eligibility analysis", "Corporate account verification", "Income validation",
    "Loan underwriting", "Credit assessment", "Digital payment mapping", "Fraud detection",
    "Transaction routing", "Cross-border KYC", "NRI account processing", "Alternate identity proof",
    "Address verification"
  ]);

  // Contract filter state
  const [contractFilter, setContractFilter] = useState('all'); // 'all', 'sent', 'received'

  // Always declare orgIdToUse before any useEffect or logic that uses it
  const orgIdToUse = orgIdConfirmed ? orgIdInput : (orgInfo?.org_id || user?.organization_id);

  // New state for contract-based restrictions
  const [contractBasedOrganizations, setContractBasedOrganizations] = useState([]);
  const [selectedOrgContractData, setSelectedOrgContractData] = useState(null);

  // Add state for contract logs
  const [contractLogs, setContractLogs] = useState([]);

  // Add state for viewing approved data request PII
  const [showApprovedDataModal, setShowApprovedDataModal] = useState(false);
  const [approvedData, setApprovedData] = useState(null);
  const [approvedDataLoading, setApprovedDataLoading] = useState(false);
  const [approvedDataError, setApprovedDataError] = useState("");

  // File sharing state
  const [fileRequests, setFileRequests] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [showFileRequestModal, setShowFileRequestModal] = useState(false);
  const [showUploadFileModal, setShowUploadFileModal] = useState(false);
  const [showDirectShareModal, setShowDirectShareModal] = useState(false);
  const [selectedFileRequest, setSelectedFileRequest] = useState(null);
  const [fileRequestForm, setFileRequestForm] = useState({
    contract_id: "",
    target_org_id: "",
    file_description: "",
    file_category: "contract",
    expires_at: ""
  });
  const [directShareForm, setDirectShareForm] = useState({
    target_org_id: "",
    file_description: "",
    file_category: "contract",
    expires_at: ""
  });
  const [fileSharingLoading, setFileSharingLoading] = useState(false);
  const [fileSharingError, setFileSharingError] = useState("");

  // Add state for bulk data requests
  const [showBulkRequestModal, setShowBulkRequestModal] = useState(false);
  const [bulkRequestLoading, setBulkRequestLoading] = useState(false);
  const [bulkRequestError, setBulkRequestError] = useState("");
  const [selectedUsersForBulk, setSelectedUsersForBulk] = useState([]);
  const [targetOrgUsers, setTargetOrgUsers] = useState([]);
  const [targetOrgContracts, setTargetOrgContracts] = useState([]);
  const [bulkRequestForm, setBulkRequestForm] = useState({
    target_org_id: "",
    selected_resources: [],
    selected_purposes: [],
    retention_window: "30 days",
    request_message: ""
  });

  // Add state for bulk data viewing
  const [showBulkDataModal, setShowBulkDataModal] = useState(false);
  const [bulkDataUrl, setBulkDataUrl] = useState("");
  const [bulkDataFileId, setBulkDataFileId] = useState("");
  const [bulkDataLoading, setBulkDataLoading] = useState(false);
  const [bulkDataError, setBulkDataError] = useState("");

  // Fetch contract logs when orgIdToUse changes
  useEffect(() => {
    const fetchContractLogs = async () => {
      try {
        const api = createAxiosInstance();
        const res = await api.get(`/policy/org-dashboard/${orgIdToUse}/contract-logs`);
        setContractLogs(res.data || []);
      } catch (err) {
        setContractLogs([]);
      }
    };
    fetchContractLogs();
  }, [orgIdToUse]);

  // Fetch contract types
  useEffect(() => {
    fetchContractTypes();
  }, []);

  // Fetch alerts when alerts tab is active
  useEffect(() => {
    if (activeTab === 'alerts' && orgIdToUse) {
      fetchAlerts(true);
      fetchUnreadAlertsCount();
      fetchBlockedIPs();
    }
  }, [activeTab, orgIdToUse]);

  // Fetch alerts when filters change
  useEffect(() => {
    if (activeTab === 'alerts' && orgIdToUse) {
      fetchAlerts(true);
    }
  }, [alertsFilters, orgIdToUse]);

  // Fetch alerts when pagination changes
  useEffect(() => {
    if (activeTab === 'alerts' && orgIdToUse) {
      fetchAlerts();
    }
  }, [alertsPagination.offset, orgIdToUse]);

  // Fetch audit logs when audit tab is active
  useEffect(() => {
    if (activeTab === 'audit_logs' && orgIdToUse) {
      fetchAuditLogs(true);
    }
  }, [activeTab, orgIdToUse]);

  // Fetch audit logs when pagination changes
  useEffect(() => {
    if (activeTab === 'audit_logs' && orgIdToUse) {
      fetchAuditLogs();
    }
  }, [auditLogsPagination.offset, orgIdToUse]);

  // Check for alerts when user logs in
  useEffect(() => {
    if (orgIdToUse && user) {
      // Small delay to ensure data is loaded
      const timer = setTimeout(() => {
        checkForAlertsOnLogin();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [orgIdToUse, user]);

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
      console.log('DEBUG: fetchOrgData function called');
      console.log('DEBUG: orgIdToUse:', orgIdToUse);
      console.log('DEBUG: user:', user);
      
      try {
        setError(null);
        const orgId = orgIdToUse;
        
        // Check token at the beginning
        const tokenAtStart = localStorage.getItem('token');
        console.log('DEBUG: Token at start of fetchOrgData:', tokenAtStart ? `${tokenAtStart.substring(0, 20)}...` : 'null');
        
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
        

        
        // Test token with a simple request first
        console.log('DEBUG: Testing token with a simple request...');
        try {
          const testResponse = await api.get('/auth/me');
          console.log('DEBUG: Test request successful:', testResponse.status);
        } catch (testErr) {
          console.error('DEBUG: Test request failed:', testErr);
        }
        
        // Fetch inter-org contracts
        console.log('DEBUG: About to fetch inter-org contracts for orgId:', orgId);
        
        // Check token right before the request
        const tokenBeforeRequest = localStorage.getItem('token');
        console.log('DEBUG: Token before inter-org contracts request:', tokenBeforeRequest ? `${tokenBeforeRequest.substring(0, 20)}...` : 'null');
        
        // Check if user is still authenticated
        console.log('DEBUG: Current user state:', user);
        console.log('DEBUG: User authentication status:', user ? 'authenticated' : 'not authenticated');
        
        // Create a fresh axios instance specifically for this request
        console.log('DEBUG: Creating fresh axios instance for inter-org contracts request');
        
        // Force a fresh token retrieval
        const freshToken = localStorage.getItem('token');
        console.log('DEBUG: Fresh token retrieved:', freshToken ? `${freshToken.substring(0, 20)}...` : 'null');
        
        if (!freshToken) {
          console.error('DEBUG: No fresh token available for inter-org contracts request');
          throw new Error('Authentication token not available');
        }
        
        const freshApi = axios.create({
          baseURL: 'http://localhost:8000',
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('DEBUG: Fresh API headers:', freshApi.defaults.headers);
        
        const contractsResponse = await freshApi.get(`/inter-org-contracts/org/${orgId}`);
        console.log('DEBUG: Contracts response:', contractsResponse);
        
        // Check token after the request
        const tokenAfterRequest = localStorage.getItem('token');
        console.log('DEBUG: Token after inter-org contracts request:', tokenAfterRequest ? `${tokenAfterRequest.substring(0, 20)}...` : 'null');
        
        const allContracts = contractsResponse.data || [];
        setContracts(allContracts);
        
        // Separate sent and received contracts
        const sent = allContracts.filter(contract => contract.is_requester);
        const received = allContracts.filter(contract => !contract.is_requester);
        setSentContracts(sent);
        setReceivedContracts(received);
        
        // Calculate contract statistics
        const stats = {
          total_sent: sent.length,
          total_received: received.length,
          pending_sent: sent.filter(c => c.approval_status === 'pending').length,
          pending_received: received.filter(c => c.approval_status === 'pending').length,
          active_sent: sent.filter(c => c.status === 'active').length,
          active_received: received.filter(c => c.status === 'active').length,
          rejected_sent: sent.filter(c => c.approval_status === 'rejected').length,
          rejected_received: received.filter(c => c.approval_status === 'rejected').length
        };
        setContractStats(stats);
        
        // Fetch audit logs using enhanced endpoint
        try {
          const logsResponse = await api.get(`/audit/org/${orgIdToUse}`);
          const logsData = logsResponse.data?.logs || logsResponse.data || [];
          const logs = logsData.map(log => ({
            id: log.id || log._id || log.log_id,
            date: log.date || new Date(log.created_at).toLocaleString(),
            type: log.type || log.log_type || 'consent',
            dataSource: log.dataSource || log.data_source || 'individual',
            fintechName: log.fintechName || log.fintech_name || 'Unknown',
            fintechId: log.fintechId || log.fintech_id || '',
            dataAccessed: log.dataAccessed || (log.resource_name?.charAt(0).toUpperCase() + log.resource_name?.slice(1)),
            purpose: log.purpose || (Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose),
            ipAddress: log.ipAddress || log.ip_address || 'N/A',
            region: log.region || 'Unknown Location'
          }));
          setAuditLogs(logs);
        } catch (auditErr) {
          console.error('Error fetching audit logs:', auditErr);
          // Fallback to old endpoint
          try {
            const fallbackResponse = await api.get(`/policy/org-dashboard/${orgIdToUse}/logs`);
            const logsArr = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
            const logs = logsArr.map(log => ({
              id: log._id || log.log_id,
              date: new Date(log.created_at).toLocaleString(),
              type: log.log_type || 'consent',
              dataSource: log.data_source || 'individual',
              fintechName: log.fintechName || log.fintech_name || 'Unknown',
              fintechId: log.fintechId || log.fintech_id || '',
              dataAccessed: log.resource_name?.charAt(0).toUpperCase() + log.resource_name?.slice(1),
              purpose: Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose,
              ipAddress: log.ip_address || 'N/A',
              region: log.region || 'Unknown Location'
            }));
            setAuditLogs(logs);
          } catch (fallbackErr) {
            console.error('Error fetching audit logs from fallback endpoint:', fallbackErr);
            setAuditLogs([]);
          }
        }
        
        // Fetch data categories
        const categoriesResponse = await api.get(`/policy/org-dashboard/${orgIdToUse}/data_categories`);
        setDataCategories(categoriesResponse.data.data_categories || []);
        
        // Fetch compliance metrics
        const complianceResponse = await api.get(`/policy/compliance/org/${orgId}`);
        setComplianceMetrics(complianceResponse.data || []);
        
        // Fetch file sharing data
        try {
          const fileRequestsResponse = await api.get(`/file-sharing/requests/${orgIdToUse}`);
          setFileRequests(fileRequestsResponse.data?.file_requests || []);
          
          const sharedFilesResponse = await api.get(`/file-sharing/shared-files/${orgIdToUse}`);
          setSharedFiles(sharedFilesResponse.data?.shared_files || []);
        } catch (fileErr) {
          console.error('Error fetching file sharing data:', fileErr);
          setFileRequests([]);
          setSharedFiles([]);
        }
        
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
    if (confirm('Are you sure you want to reject this data request?')) {
      try {
        const api = createAxiosInstance();
        await api.post('/data-requests/respond', {
          request_id: requestId,
          response: 'rejected',
          response_message: 'Request rejected by organization admin'
        });
        window.location.reload();
      } catch (err) {
        console.error('Error rejecting request:', err);
        alert('Failed to reject request');
      }
    }
  };

  const handleApproveBulkRequest = async (bulkRequestId) => {
    if (confirm('Are you sure you want to approve this bulk data request? This will generate an encrypted CSV file with all the requested data.')) {
      try {
        const api = createAxiosInstance();
        const response = await api.post(`/data-requests/approve-bulk-request/${bulkRequestId}`);
        
        alert(`Bulk request approved successfully! ${response.data.approved_requests} requests approved. CSV file generated with ${response.data.record_count} records.`);
        window.location.reload();
          } catch (err) {
      console.error('Error approving bulk request:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to approve bulk request';
      alert(typeof errorMessage === 'string' ? errorMessage : 'Failed to approve bulk request');
    }
    }
  };

  // Fetch available organizations and resources for data requests
  const fetchAvailableOrganizations = async () => {
    try {
      const api = createAxiosInstance();
      // Use the new endpoint that only returns organizations with active contracts
      const response = await api.get(`/data-requests/available-organizations/${orgIdToUse}`);
      const orgsWithContracts = response.data || [];
      setContractBasedOrganizations(orgsWithContracts);
      
      // Also fetch all organizations for backward compatibility (contract creation)
      const allOrgsResponse = await api.get('/organization/list/organizations');
      const allOrgs = allOrgsResponse.data.organizations || [];
      const filteredOrgs = allOrgs.filter(org => org.org_id !== orgIdToUse);
      setAvailableOrganizations(filteredOrgs);
    } catch (err) {
      console.error('Error fetching available organizations:', err);
      // Fallback to fetching all organizations
      try {
        const api = createAxiosInstance();
        const response = await api.get('/organization/list/organizations');
        const allOrgs = response.data.organizations || [];
        const filteredOrgs = allOrgs.filter(org => org.org_id !== orgIdToUse);
        setAvailableOrganizations(filteredOrgs);
      } catch (fallbackErr) {
        console.error('Error fetching all organizations:', fallbackErr);
      }
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

  const fetchUserPII = async (userId) => {
    setUserPIILoading(true);
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/organization/${orgIdToUse}/clients/${userId}/pii`);
      setSelectedUserPII(response.data);
      setShowUserPIIModal(true);
    } catch (err) {
      console.error('Error fetching user PII:', err);
      alert('Failed to fetch user PII data');
    } finally {
      setUserPIILoading(false);
    }
  };

  const handleOpenUserPIIModal = (user) => {
    fetchUserPII(user.user_id);
  };

  const handleCloseUserPIIModal = () => {
    setShowUserPIIModal(false);
    setSelectedUserPII(null);
  };

  // Filter and search users
  const filteredUsers = orgUsers.filter(user => {
    const matchesSearch = userSearchTerm === "" || 
      user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesStatus = userFilterStatus === "all" || 
      (userFilterStatus === "active" && user.active_policies_count > 0) ||
      (userFilterStatus === "inactive" && user.active_policies_count === 0);
    
    const matchesResource = userFilterResource === "all" || 
      (user.shared_resources && user.shared_resources.includes(userFilterResource));
    
    return matchesSearch && matchesStatus && matchesResource;
  });

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
    setSelectedOrgContractData(null);
    setRequestForm({
      target_org_id: "",
      target_user_email: "",
      requested_resources: [],
      purpose: [],
      retention_window: "30 days",
      request_message: ""
    });
    await fetchAvailableOrganizations(); // This now fetches contract-based organizations
    setAvailableResources([]); // Reset resources until organization is selected
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
    if (!requestForm.target_org_id) {
      setCreateRequestError("Please select a target organization");
      setCreateRequestLoading(false);
      return;
    }
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
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to create data request';
      setCreateRequestError(typeof errorMessage === 'string' ? errorMessage : 'Failed to create data request');
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
    // Only allow resources that are in the contract
    if (!selectedOrgContractData || !selectedOrgContractData.allowed_resources.includes(resource)) {
      return; // Don't allow selection of unauthorized resources
    }
    
    setRequestForm(prev => ({
      ...prev,
      requested_resources: prev.requested_resources.includes(resource)
        ? prev.requested_resources.filter(r => r !== resource)
        : [...prev.requested_resources, resource]
    }));
  };

  const handlePurposeToggle = (purpose) => {
    // Only allow purposes that are permitted for the selected resources
    const allowedPurposes = getAvailablePurposesForSelectedResources();
    if (!allowedPurposes.includes(purpose)) {
      return; // Don't allow selection of unauthorized purposes
    }
    
    setRequestForm(prev => ({
      ...prev,
      purpose: prev.purpose.includes(purpose)
        ? prev.purpose.filter(p => p !== purpose)
        : [...prev.purpose, purpose]
    }));
  };

  const getAvailablePurposesForSelectedResources = () => {
    if (!selectedOrgContractData || !selectedOrgContractData.allowed_purposes) {
      return [];
    }
    
    const allowedPurposes = new Set();
    requestForm.requested_resources.forEach(resource => {
      const resourcePurposes = selectedOrgContractData.allowed_purposes[resource] || [];
      resourcePurposes.forEach(purpose => allowedPurposes.add(purpose));
    });
    
    return Array.from(allowedPurposes);
  };

  const handleOrganizationChange = async (orgId) => {
    setSelectedOrgId(orgId);
    setRequestForm(prev => ({
      ...prev,
      target_org_id: orgId,
      target_user_email: "", // Reset user selection when org changes
      requested_resources: [], // Reset resources when org changes
      purpose: [] // Reset purposes when org changes
    }));
    
    if (orgId) {
      await fetchUsersByOrganization(orgId);
      
      // Find the contract data for the selected organization
      const selectedOrgContract = contractBasedOrganizations.find(org => org.org_id === orgId);
      if (selectedOrgContract) {
        setSelectedOrgContractData(selectedOrgContract);
        // Set available resources based on contract
        setAvailableResources(selectedOrgContract.allowed_resources || []);
      } else {
        setSelectedOrgContractData(null);
        setAvailableResources([]);
      }
    } else {
      setAvailableUsers([]);
      setSelectedOrgContractData(null);
      setAvailableResources([]);
    }
  };

  // Contract handlers
  const handleOpenCreateContractModal = async () => {
    setShowCreateContractModal(true);
    setCreateContractError("");
    setContractForm({
      target_org_id: "",
      contract_name: "",
      contract_type: "data_sharing",
      contract_description: "",
      resources_allowed: [],
      approval_message: ""
    });
    setContractResourceForm({
      resource_name: "",
      purpose: [],
      retention_window: "30 days"
    });
    
    // Fetch all organizations in PedolOne
    try {
      const api = createAxiosInstance();
      const response = await api.get('/organization/list/organizations');
      const allOrgs = response.data.organizations || [];
      // Filter out the current organization
      const filteredOrgs = allOrgs.filter(org => org.org_id !== orgIdToUse);
      setAllOrganizations(filteredOrgs);
    } catch (err) {
      console.error('Error fetching all organizations:', err);
      setCreateContractError('Failed to fetch organizations');
    }
  };

  const handleCloseCreateContractModal = () => {
    setShowCreateContractModal(false);
    setCreateContractError("");
    // Reset form
    setContractForm({
      target_org_id: "",
      contract_name: "",
      contract_type: "data_sharing",
      contract_description: "",
      resources_allowed: [],
      approval_message: ""
    });
    setContractResourceForm({
      resource_name: "",
      purpose: [],
      retention_window: "30 days"
    });
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    setCreateContractLoading(true);
    setCreateContractError("");

    // Validate form data
    if (!contractForm.target_org_id) {
      setCreateContractError("Please select a target organization");
      setCreateContractLoading(false);
      return;
    }
    
    // For file sharing contracts, automatically add default resources
    let finalResources = contractForm.resources_allowed;
    if (contractForm.contract_type === "file_sharing" && contractForm.resources_allowed.length === 0) {
      finalResources = [
        {
          resource_name: "excel",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        },
        {
          resource_name: "pdf",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        },
        {
          resource_name: "doc",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        },
        {
          resource_name: "docx",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        },
        {
          resource_name: "csv",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        },
        {
          resource_name: "json",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        },
        {
          resource_name: "xml",
          purpose: ["Document sharing", "Compliance reporting"],
          retention_window: "90 days"
        }
      ];
    } else if (contractForm.resources_allowed.length === 0) {
      setCreateContractError("Please add at least one resource");
      setCreateContractLoading(false);
      return;
    }

    try {
      const api = createAxiosInstance();
      
      // Get target organization name for contract naming
      const targetOrg = allOrganizations.find(org => org.org_id === contractForm.target_org_id);
      const targetOrgName = targetOrg ? targetOrg.org_name : 'Unknown Organization';
      
      // Prepare resources with proper structure
      const resourcesWithTimestamps = (finalResources || []).map(resource => ({
        resource_name: resource.resource_name,
        purpose: resource.purpose,
        retention_window: resource.retention_window,
        created_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        signature: "" // Will be generated by backend
      }));
      
      const contractData = {
        target_org_id: contractForm.target_org_id,
        contract_name: contractForm.contract_name.trim() || `Contract with ${targetOrgName} - ${new Date().toLocaleDateString()}`,
        contract_type: contractForm.contract_type,
        contract_description: contractForm.contract_description || `Data sharing agreement with ${targetOrgName}`,
        resources_allowed: resourcesWithTimestamps,
        approval_message: contractForm.approval_message
      };
      
      await api.post('/inter-org-contracts/create', contractData);
      setShowCreateContractModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error creating contract:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to create contract';
      setCreateContractError(typeof errorMessage === 'string' ? errorMessage : 'Failed to create contract');
    } finally {
      setCreateContractLoading(false);
    }
  };

  const handleContractFormChange = (field, value) => {
    setContractForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContractResourceFormChange = (field, value) => {
    setContractResourceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddContractResource = () => {
    if (!contractResourceForm.resource_name || contractResourceForm.purpose.length === 0) {
      alert("Please select a resource and at least one purpose");
      return;
    }

    setContractForm(prev => ({
      ...prev,
      resources_allowed: [...prev.resources_allowed, { ...contractResourceForm }]
    }));

    // Reset resource form
    setContractResourceForm({
      resource_name: "",
      purpose: [],
      retention_window: "30 days"
    });
  };

  const handleRemoveContractResource = (index) => {
    setContractForm(prev => ({
      ...prev,
      resources_allowed: prev.resources_allowed.filter((_, i) => i !== index)
    }));
  };

  const handleContractResourcePurposeToggle = (purpose) => {
    setContractResourceForm(prev => ({
      ...prev,
      purpose: prev.purpose.includes(purpose)
        ? prev.purpose.filter(p => p !== purpose)
        : [...prev.purpose, purpose]
    }));
  };

  const handleApproveContract = async (contractId) => {
    const response_message = prompt('Optional: Add a response message for approval');
    
    try {
      const api = createAxiosInstance();
      await api.post('/inter-org-contracts/respond', {
        contract_id: contractId,
        status: 'approved',
        response_message
      });
      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error('Error approving contract:', err);
      alert('Failed to approve contract: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRejectContract = async (contractId) => {
    const response_message = prompt('Optional: Add a response message for rejection');
    
    try {
      const api = createAxiosInstance();
      await api.post('/inter-org-contracts/respond', {
        contract_id: contractId,
        status: 'rejected',
        response_message
      });
      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error('Error rejecting contract:', err);
      alert('Failed to reject contract: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Contract Management Functions
  const fetchContractTypes = async () => {
    try {
      const api = createAxiosInstance();
      const response = await api.get('/inter-org-contracts/contract-types');
      setContractTypes(response.data.contract_types || []);
    } catch (err) {
      console.error('Error fetching contract types:', err);
    }
  };

  const handleOpenEditContractModal = (contract) => {
    setSelectedContract(contract);
    setEditContractForm({
      contract_name: contract.contract_name || contract.contract_id,
      contract_description: contract.contract_description || "",
      contract_type: contract.contract_type || "data_sharing",
      resources_allowed: contract.resources_allowed || [],
      approval_message: ""
    });
    setShowEditContractModal(true);
    setContractActionError("");
  };

  const handleCloseEditContractModal = () => {
    setShowEditContractModal(false);
    setSelectedContract(null);
    setEditContractForm({
      contract_name: "",
      contract_description: "",
      contract_type: "data_sharing",
      resources_allowed: [],
      approval_message: ""
    });
    setContractActionError("");
  };

  const handleEditContract = async (e) => {
    e.preventDefault();
    setContractActionLoading(true);
    setContractActionError("");

    if (!editContractForm.contract_name.trim()) {
      setContractActionError("Contract name is required");
      setContractActionLoading(false);
      return;
    }

    if (editContractForm.resources_allowed.length === 0) {
      setContractActionError("At least one resource is required");
      setContractActionLoading(false);
      return;
    }

    try {
      const api = createAxiosInstance();
      
      // Prepare resources with proper structure
      const resourcesWithTimestamps = (editContractForm.resources_allowed || []).map(resource => ({
        resource_name: resource.resource_name,
        purpose: resource.purpose,
        retention_window: resource.retention_window,
        created_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        signature: ""
      }));
      
      const updateData = {
        contract_id: selectedContract.contract_id,
        contract_name: editContractForm.contract_name,
        contract_description: editContractForm.contract_description,
        contract_type: editContractForm.contract_type,
        resources_allowed: resourcesWithTimestamps,
        approval_message: editContractForm.approval_message
      };
      
      await api.put('/inter-org-contracts/update', updateData);
      setShowEditContractModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error updating contract:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to update contract';
      setContractActionError(typeof errorMessage === 'string' ? errorMessage : 'Failed to update contract');
    } finally {
      setContractActionLoading(false);
    }
  };

  const handleOpenDeleteContractModal = (contract) => {
    setSelectedContract(contract);
    setDeleteContractForm({
      deletion_reason: "",
      approval_message: ""
    });
    setShowDeleteContractModal(true);
    setContractActionError("");
  };

  const handleCloseDeleteContractModal = () => {
    setShowDeleteContractModal(false);
    setSelectedContract(null);
    setDeleteContractForm({
      deletion_reason: "",
      approval_message: ""
    });
    setContractActionError("");
  };

  const handleDeleteContract = async (e) => {
    e.preventDefault();
    setContractActionLoading(true);
    setContractActionError("");

    if (!deleteContractForm.deletion_reason.trim()) {
      setContractActionError("Deletion reason is required");
      setContractActionLoading(false);
      return;
    }

    try {
      const api = createAxiosInstance();
      
      const deletionData = {
        contract_id: selectedContract.contract_id,
        deletion_reason: deleteContractForm.deletion_reason,
        approval_message: deleteContractForm.approval_message
      };
      
      await api.delete('/inter-org-contracts/delete', { data: deletionData });
      setShowDeleteContractModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error deleting contract:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to delete contract';
      setContractActionError(typeof errorMessage === 'string' ? errorMessage : 'Failed to delete contract');
    } finally {
      setContractActionLoading(false);
    }
  };

  const handleApproveContractAction = async (contractId, actionType) => {
    const response_message = prompt('Optional: Add a response message for approval');
    
    try {
      const api = createAxiosInstance();
      await api.post('/inter-org-contracts/approve-action', {
        contract_id: contractId,
        action_type: actionType,
        status: 'approved',
        response_message
      });
      window.location.reload();
    } catch (err) {
      console.error('Error approving contract action:', err);
      alert('Failed to approve contract action: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRejectContractAction = async (contractId, actionType) => {
    const response_message = prompt('Optional: Add a response message for rejection');
    
    try {
      const api = createAxiosInstance();
      await api.post('/inter-org-contracts/approve-action', {
        contract_id: contractId,
        action_type: actionType,
        status: 'rejected',
        response_message
      });
      window.location.reload();
    } catch (err) {
      console.error('Error rejecting contract action:', err);
      alert('Failed to reject contract action: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenContractVersionsModal = async (contract) => {
    setSelectedContract(contract);
    setShowContractVersionsModal(true);
    
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/inter-org-contracts/versions/${contract.contract_id}`);
      setContractVersions(response.data.versions || []);
    } catch (err) {
      console.error('Error fetching contract versions:', err);
      setContractVersions([]);
    }
  };

  const handleOpenContractAuditModal = async (contract) => {
    setSelectedContract(contract);
    setShowContractAuditModal(true);
    
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/inter-org-contracts/audit-logs/${contract.contract_id}`);
      setContractAuditLogs(response.data.audit_logs || []);
    } catch (err) {
      console.error('Error fetching contract audit logs:', err);
      setContractAuditLogs([]);
    }
  };

  const handleEditContractFormChange = (field, value) => {
    setEditContractForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteContractFormChange = (field, value) => {
    setDeleteContractForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditContractResourceFormChange = (field, value) => {
    setContractResourceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddEditContractResource = () => {
    if (!contractResourceForm.resource_name || contractResourceForm.purpose.length === 0) {
      alert("Please select a resource and at least one purpose");
      return;
    }

    setEditContractForm(prev => ({
      ...prev,
      resources_allowed: [...prev.resources_allowed, { ...contractResourceForm }]
    }));

    // Reset resource form
    setContractResourceForm({
      resource_name: "",
      purpose: [],
      retention_window: "30 days"
    });
  };

  const handleRemoveEditContractResource = (index) => {
    setEditContractForm(prev => ({
      ...prev,
      resources_allowed: prev.resources_allowed.filter((_, i) => i !== index)
    }));
  };

  // Remove Contracts and Compliance from the tabs array
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'users', label: 'User Management', icon: <Users size={16} /> },
    { id: 'data_requests', label: 'Data Requests', icon: <FileText size={16} /> },
    { id: 'contracts', label: 'Contracts', icon: <FileText size={16} /> },
    { id: 'file_sharing', label: 'File Sharing', icon: <FileText size={16} /> },
    { id: 'contract_logs', label: 'Contract Logs', icon: <Database size={16} /> },
    { id: 'audit_logs', label: 'Audit Logs', icon: <Database size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <AlertCircle size={16} /> },
    { id: 'data_categories', label: 'Data Categories', icon: <Database size={16} /> },
  ];

  const handleViewApprovedData = async (requestId) => {
    setApprovedDataLoading(true);
    setApprovedDataError("");
    setShowApprovedDataModal(true);
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/data-requests/approved-data/${requestId}`);
      setApprovedData(response.data);
    } catch (err) {
      setApprovedDataError("Failed to fetch approved PII data");
      setApprovedData(null);
    } finally {
      setApprovedDataLoading(false);
    }
  };

  const handleCloseApprovedDataModal = () => {
    setShowApprovedDataModal(false);
    setApprovedData(null);
    setApprovedDataError("");
  };

  // Bulk data request handlers
  const handleOpenBulkRequestModal = async () => {
    setShowBulkRequestModal(true);
    setBulkRequestError("");
    setSelectedUsersForBulk([]);
    setTargetOrgUsers([]);
    setTargetOrgContracts([]);
    setBulkRequestForm({
      target_org_id: "",
      selected_resources: [],
      selected_purposes: [],
      retention_window: "30 days",
      request_message: ""
    });
    // Fetch contract-based organizations
    await fetchAvailableOrganizations();
  };

  const handleCloseBulkRequestModal = () => {
    setShowBulkRequestModal(false);
    setBulkRequestError("");
    setSelectedUsersForBulk([]);
    setTargetOrgUsers([]);
    setTargetOrgContracts([]);
  };

  const handleTargetOrgChange = async (orgId) => {
    if (!orgId) {
      setTargetOrgUsers([]);
      setTargetOrgContracts([]);
      setBulkRequestForm(prev => ({
        ...prev,
        target_org_id: "",
        selected_resources: [],
        selected_purposes: [],
        retention_window: "30 days"
      }));
      return;
    }

    setBulkRequestForm(prev => ({ ...prev, target_org_id: orgId }));
    setSelectedUsersForBulk([]);
    setBulkRequestError("");

    try {
      const api = createAxiosInstance();
      
      // Get users from target organization
      const usersResponse = await api.get(`/organization/${orgId}/users`);
      setTargetOrgUsers(usersResponse.data || []);
      
      // Get contracts with this organization to determine available resources and purposes
      const contractsResponse = await api.get(`/inter-org-contracts/org/${orgIdToUse}`);
      const contracts = contractsResponse.data || [];
      
      // Filter contracts where this org is the target (we can request from them)
      const relevantContracts = contracts.filter(contract => 
        contract.target_org_id === orgId && contract.status === 'active'
      );
      
      setTargetOrgContracts(relevantContracts);
      
      // Extract available resources and purposes from contracts
      const availableResources = new Set();
      const availablePurposes = new Set();
      let defaultRetention = "30 days";
      
      relevantContracts.forEach(contract => {
        if (contract.resources_allowed) {
          contract.resources_allowed.forEach(resource => {
            if (typeof resource === 'object' && resource.resource_name) {
              availableResources.add(resource.resource_name);
              if (resource.purpose) {
                resource.purpose.forEach(p => availablePurposes.add(p));
              }
              if (resource.retention_window) {
                defaultRetention = resource.retention_window;
              }
            } else if (typeof resource === 'string') {
              availableResources.add(resource);
            }
          });
        }
      });
      
      setBulkRequestForm(prev => ({
        ...prev,
        target_org_id: orgId,
        selected_resources: [],
        selected_purposes: [],
        retention_window: defaultRetention
      }));
      
    } catch (err) {
      console.error('Error fetching target organization data:', err);
      setBulkRequestError('Failed to fetch organization data');
    }
  };

  const handleUserSelectionForBulk = (userId, isSelected) => {
    if (isSelected) {
      setSelectedUsersForBulk(prev => [...prev, userId]);
    } else {
      setSelectedUsersForBulk(prev => prev.filter(id => id !== userId));
    }
  };

  const handleBulkRequestSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsersForBulk.length === 0) {
      setBulkRequestError("Please select at least one user");
      return;
    }
    if (!bulkRequestForm.target_org_id) {
      setBulkRequestError("Please select a target organization");
      return;
    }
    if (bulkRequestForm.selected_resources.length === 0) {
      setBulkRequestError("Please select at least one resource");
      return;
    }
    if (bulkRequestForm.selected_purposes.length === 0) {
      setBulkRequestError("Please select at least one purpose");
      return;
    }

    // Validate that all required fields are present
    if (!bulkRequestForm.target_org_id || 
        !Array.isArray(bulkRequestForm.selected_resources) || 
        !Array.isArray(bulkRequestForm.selected_purposes)) {
      setBulkRequestError("Invalid form data. Please check your selections.");
      return;
    }

    setBulkRequestLoading(true);
    setBulkRequestError("");

    try {
      const api = createAxiosInstance();
      
      // Extract actual user IDs from unique identifiers
      const selectedUserIds = selectedUsersForBulk.map(uniqueId => {
        const userId = uniqueId.split('_')[0];
        const parsedId = parseInt(userId);
        if (isNaN(parsedId)) {
          throw new Error(`Invalid user ID: ${userId}`);
        }
        return parsedId;
      });
      
      // Create single bulk request
      const bulkRequestData = {
        target_org_id: bulkRequestForm.target_org_id,
        selected_users: selectedUserIds,
        requested_resources: bulkRequestForm.selected_resources,
        purpose: bulkRequestForm.selected_purposes,
        retention_window: bulkRequestForm.retention_window,
        request_message: bulkRequestForm.request_message
      };
      
      console.log('Selected users for bulk:', selectedUsersForBulk);
      console.log('Extracted user IDs:', selectedUserIds);
      console.log('Sending bulk request data:', bulkRequestData);
      
      const response = await api.post('/data-requests/create-bulk-request', bulkRequestData);
      
      setShowBulkRequestModal(false);
      alert(`Bulk request created successfully! Request ID: ${response.data.bulk_request_id}`);
      window.location.reload();
    } catch (err) {
      console.error('Error creating bulk request:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to create bulk request';
      setBulkRequestError(typeof errorMessage === 'string' ? errorMessage : 'Failed to create bulk request');
    } finally {
      setBulkRequestLoading(false);
    }
  };

  const handleBulkFormChange = (field, value) => {
    setBulkRequestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBulkResourceToggle = (resource) => {
    setBulkRequestForm(prev => ({
      ...prev,
      selected_resources: prev.selected_resources.includes(resource)
        ? prev.selected_resources.filter(r => r !== resource)
        : [...prev.selected_resources, resource]
    }));
  };

  const handleBulkPurposeToggle = (purpose) => {
    setBulkRequestForm(prev => ({
      ...prev,
      selected_purposes: prev.selected_purposes.includes(purpose)
        ? prev.selected_purposes.filter(p => p !== purpose)
        : [...prev.selected_purposes, purpose]
    }));
  };

  // Bulk data viewing handlers
  const handleViewBulkData = async (fileId) => {
    setShowBulkDataModal(true);
    setBulkDataLoading(true);
    setBulkDataError("");
    setBulkDataFileId(fileId);
    
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/data-requests/view-csv/${fileId}`);
      
      // Create a blob URL for the CSV file
      const blob = new Blob([response.data], { 
        type: 'text/html' 
      });
      const url = URL.createObjectURL(blob);
      setBulkDataUrl(url);
    } catch (err) {
      console.error('Error loading bulk data:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to load bulk data';
      setBulkDataError(typeof errorMessage === 'string' ? errorMessage : 'Failed to load bulk data');
    } finally {
      setBulkDataLoading(false);
    }
  };

  const handleCloseBulkDataModal = () => {
    setShowBulkDataModal(false);
    setBulkDataError("");
    setBulkDataFileId("");
    if (bulkDataUrl) {
      URL.revokeObjectURL(bulkDataUrl);
      setBulkDataUrl("");
    }
  };

  // File sharing handlers
  const handleOpenFileRequestModal = () => {
    setShowFileRequestModal(true);
    setFileSharingError("");
    setFileRequestForm({
      contract_id: "",
      target_org_id: "",
      file_description: "",
      file_category: "contract",
      expires_at: ""
    });
  };

  const handleCloseFileRequestModal = () => {
    setShowFileRequestModal(false);
    setFileSharingError("");
  };

  const handleCreateFileRequest = async (e) => {
    e.preventDefault();
    setFileSharingLoading(true);
    setFileSharingError("");

    try {
      const api = createAxiosInstance();
      const response = await api.post('/file-sharing/request-file', fileRequestForm);
      
      setShowFileRequestModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error creating file request:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to create file request';
      setFileSharingError(typeof errorMessage === 'string' ? errorMessage : 'Failed to create file request');
    } finally {
      setFileSharingLoading(false);
    }
  };

  const handleFileRequestFormChange = (field, value) => {
    setFileRequestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApproveFileRequest = async (requestId) => {
    try {
      const api = createAxiosInstance();
      await api.post(`/file-sharing/approve-request/${requestId}`);
      window.location.reload();
    } catch (err) {
      console.error('Error approving file request:', err);
      alert('Failed to approve file request: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRejectFileRequest = async (requestId) => {
    const rejectionReason = prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    try {
      const api = createAxiosInstance();
      const formData = new FormData();
      formData.append('rejection_reason', rejectionReason);
      // For FormData, we need to remove the Content-Type header so browser can set it with boundary
      await api.post(`/file-sharing/reject-request/${requestId}`, formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      window.location.reload();
    } catch (err) {
      console.error('Error rejecting file request:', err);
      alert('Failed to reject file request: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenUploadFileModal = (fileRequest) => {
    setSelectedFileRequest(fileRequest);
    setShowUploadFileModal(true);
    setFileSharingError("");
  };

  const handleCloseUploadFileModal = () => {
    setShowUploadFileModal(false);
    setSelectedFileRequest(null);
    setFileSharingError("");
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    setFileSharingLoading(true);
    setFileSharingError("");

    const fileInput = document.getElementById('file-upload');
    const file = fileInput.files[0];
    
    if (!file) {
      setFileSharingError("Please select a PDF file");
      setFileSharingLoading(false);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileSharingError("Only PDF files are allowed");
      setFileSharingLoading(false);
      return;
    }

    try {
      const api = createAxiosInstance();
      const formData = new FormData();
      formData.append('file', file);
      
      const fileDescription = document.getElementById('file-description').value;
      if (fileDescription) {
        formData.append('file_description', fileDescription);
      }

      // For file uploads, we need to remove the Content-Type header so browser can set it with boundary
      await api.post(`/file-sharing/upload-file/${selectedFileRequest.request_id}`, formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      
      setShowUploadFileModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to upload file';
      setFileSharingError(typeof errorMessage === 'string' ? errorMessage : 'Failed to upload file');
    } finally {
      setFileSharingLoading(false);
    }
  };

  const handleOpenDirectShareModal = async () => {
    setShowDirectShareModal(true);
    setFileSharingError("");
    setDirectShareForm({
      target_org_id: "",
      file_description: "",
      file_category: "contract",
      expires_at: ""
    });
    
    // Fetch organizations with file sharing contracts
    try {
      console.log('🔍 Fetching organizations with contracts for org:', orgIdToUse);
      const api = createAxiosInstance();
      const response = await api.get(`/file-sharing/organizations-with-contracts/${orgIdToUse}`);
      const orgsWithContracts = response.data.organizations || [];
      console.log('📋 Organizations with contracts:', orgsWithContracts);
      
      if (orgsWithContracts.length > 0) {
        setAllOrganizations(orgsWithContracts);
        console.log('✅ Set organizations with contracts:', orgsWithContracts.length);
      } else {
        console.log('⚠️ No organizations with contracts found, falling back to all organizations');
        // Fallback to all organizations if no contracts found
        const allOrgsResponse = await api.get('/organization/list/organizations');
        const allOrgs = allOrgsResponse.data.organizations || [];
        const filteredOrgs = allOrgs.filter(org => org.org_id !== orgIdToUse);
        console.log('📋 All organizations (filtered):', filteredOrgs);
        setAllOrganizations(filteredOrgs);
      }
    } catch (err) {
      console.error('❌ Error fetching organizations for direct share:', err);
      // Fallback to all organizations
      try {
        console.log('🔄 Falling back to all organizations...');
        const api = createAxiosInstance();
        const response = await api.get('/organization/list/organizations');
        const allOrgs = response.data.organizations || [];
        const filteredOrgs = allOrgs.filter(org => org.org_id !== orgIdToUse);
        console.log('📋 Fallback organizations:', filteredOrgs);
        setAllOrganizations(filteredOrgs);
      } catch (fallbackErr) {
        console.error('❌ Error fetching all organizations:', fallbackErr);
        setFileSharingError('Failed to fetch organizations');
      }
    }
  };

  const handleCloseDirectShareModal = () => {
    setShowDirectShareModal(false);
    setFileSharingError("");
  };

  const handleDirectShareFormChange = (field, value) => {
    setDirectShareForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDirectFileShare = async (e) => {
    e.preventDefault();
    setFileSharingLoading(true);
    setFileSharingError("");

    // Validate form data
    if (!directShareForm.target_org_id) {
      setFileSharingError("Please select a target organization");
      setFileSharingLoading(false);
      return;
    }

    if (!directShareForm.file_description.trim()) {
      setFileSharingError("Please provide a file description");
      setFileSharingLoading(false);
      return;
    }

    const fileInput = document.getElementById('direct-share-file');
    const file = fileInput.files[0];
    
    if (!file) {
      setFileSharingError("Please select a PDF file");
      setFileSharingLoading(false);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileSharingError("Only PDF files are allowed");
      setFileSharingLoading(false);
      return;
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setFileSharingError("File size exceeds 50MB limit");
      setFileSharingLoading(false);
      return;
    }

    try {
      const api = createAxiosInstance();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_org_id', directShareForm.target_org_id);
      formData.append('file_description', directShareForm.file_description.trim());
      formData.append('file_category', directShareForm.file_category);
      
      if (directShareForm.expires_at) {
        formData.append('expires_at', directShareForm.expires_at);
      }

      // Debug: Log the FormData contents
      console.log('🔍 [Frontend] FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(`   - ${key}: ${value instanceof File ? value.name : value}`);
      }

      // For file uploads, we need to remove the Content-Type header so browser can set it with boundary
      const response = await api.post('/file-sharing/direct-share', formData, {
        headers: {
          'Content-Type': undefined
        }
      });
      
      if (response.data && response.data.file_id) {
        console.log('File shared successfully:', response.data);
        setShowDirectShareModal(false);
        // Refresh the page to show the new shared file
        window.location.reload();
      } else {
        setFileSharingError('Unexpected response from server');
      }
    } catch (err) {
      console.error('Error sharing file:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to share file';
      setFileSharingError(typeof errorMessage === 'string' ? errorMessage : 'Failed to share file');
    } finally {
      setFileSharingLoading(false);
    }
  };

  const handleViewFile = async (fileId) => {
    setShowPdfModal(true);
    setPdfLoading(true);
    setPdfError("");
    setSelectedFileId(fileId);
    
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/file-sharing/view-file/${fileId}`, {
        responseType: 'text'
      });
      
      // Create a blob URL for the secure HTML content
      const blob = new Blob([response.data], { 
        type: 'text/html' 
      });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error loading PDF:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to load PDF';
      setPdfError(typeof errorMessage === 'string' ? errorMessage : 'Failed to load PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    setPdfError("");
    setSelectedFileId("");
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl("");
    }
  };

  // Alerts functions
  const fetchAlerts = async (resetPagination = false) => {
    if (!orgIdToUse) return;
    
    setAlertsLoading(true);
    setAlertsError("");
    
    try {
      const api = createAxiosInstance();
      const params = new URLSearchParams({
        limit: alertsPagination.limit.toString(),
        offset: resetPagination ? '0' : alertsPagination.offset.toString(),
        ...(alertsFilters.alert_type && { alert_type: alertsFilters.alert_type }),
        ...(alertsFilters.severity && { severity: alertsFilters.severity }),
        ...(alertsFilters.is_read !== null && { is_read: alertsFilters.is_read.toString() })
      });
      
      const response = await api.get(`/alerts/org/${orgIdToUse}?${params}`);
      
      setAlerts(response.data.alerts);
      setAlertsPagination(prev => ({
        ...prev,
        total: response.data.total_count,
        offset: resetPagination ? 0 : prev.offset,
        hasMore: response.data.has_more
      }));
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setAlertsError('Failed to fetch alerts');
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchUnreadAlertsCount = async () => {
    if (!orgIdToUse) return;
    
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/alerts/org/${orgIdToUse}/unread-count`);
      setUnreadAlertsCount(response.data.unread_count);
    } catch (err) {
      console.error('Error fetching unread alerts count:', err);
    }
  };

  const handleMarkAlertAsRead = async (alertId) => {
    console.log('Marking alert as read:', alertId);
    try {
      const api = createAxiosInstance();
      const response = await api.put(`/alerts/${alertId}/mark-read`);
      
      if (response.status === 200) {
        // Update the alert in the list
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_read: true, resolved_at: new Date().toISOString() }
            : alert
        ));
        
        // Refresh unread count
        fetchUnreadAlertsCount();
        
        // Show success message
        console.log(`Alert ${alertId} marked as read successfully`);
      }
    } catch (err) {
      console.error('Error marking alert as read:', err);
      console.error('Error details:', err.response?.data);
      alert(`Failed to mark alert as read: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert? This action cannot be undone.')) {
      return;
    }
    
    console.log('Deleting alert:', alertId);
    try {
      const api = createAxiosInstance();
      const response = await api.delete(`/alerts/${alertId}`);
      
      if (response.status === 200) {
        // Remove the alert from the list
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        
        // Refresh unread count
        fetchUnreadAlertsCount();
        
        // Show success message
        console.log(`Alert ${alertId} deleted successfully`);
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      console.error('Error details:', err.response?.data);
      alert(`Failed to delete alert: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleMarkAllAlertsAsRead = async () => {
    if (!orgIdToUse) return;
    
    try {
      const api = createAxiosInstance();
      await api.put(`/alerts/org/${orgIdToUse}/mark-all-read`);
      
      // Update all alerts in the list
      setAlerts(prev => prev.map(alert => ({
        ...alert,
        is_read: true,
        resolved_at: new Date().toISOString()
      })));
      
      // Reset unread count
      setUnreadAlertsCount(0);
    } catch (err) {
      console.error('Error marking all alerts as read:', err);
    }
  };

  const handleAlertsFilterChange = (field, value) => {
    setAlertsFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleAlertsPageChange = (newOffset) => {
    setAlertsPagination(prev => ({ ...prev, offset: newOffset }));
  };

  const handleCheckSuspiciousActivity = async () => {
    try {
      const api = createAxiosInstance();
      await api.post('/alerts/check-suspicious-activity');
      
      // Refresh alerts after checking
      fetchAlerts(true);
      fetchUnreadAlertsCount();
    } catch (err) {
      console.error('Error checking suspicious activity:', err);
    }
  };

  // IP blocking functions
  const handleBlockIP = async (ipAddress) => {
    if (!ipAddress || ipAddress === 'N/A') return;
    
    setBlockingIP(true);
    try {
      const api = createAxiosInstance();
      await api.post('/alerts/block-ip', { ip_address: ipAddress });
      
      // Add to blocked IPs list
      setBlockedIPs(prev => [...prev, ipAddress]);
      
      // Show success message
      alert(`IP address ${ipAddress} has been blocked successfully.`);
    } catch (err) {
      console.error('Error blocking IP:', err);
      alert('Failed to block IP address. Please try again.');
    } finally {
      setBlockingIP(false);
    }
  };

  const handleUnblockIP = async (ipAddress) => {
    try {
      const api = createAxiosInstance();
      await api.delete(`/alerts/unblock-ip/${ipAddress}`);
      
      // Remove from blocked IPs list
      setBlockedIPs(prev => prev.filter(ip => ip !== ipAddress));
      
      // Show success message
      alert(`IP address ${ipAddress} has been unblocked successfully.`);
    } catch (err) {
      console.error('Error unblocking IP:', err);
      alert('Failed to unblock IP address. Please try again.');
    }
  };

  const fetchBlockedIPs = async () => {
    try {
      const api = createAxiosInstance();
      const response = await api.get('/alerts/blocked-ips');
      setBlockedIPs(response.data.blocked_ips || []);
    } catch (err) {
      console.error('Error fetching blocked IPs:', err);
    }
  };

  // Alerts popup functions
  const checkForAlertsOnLogin = async () => {
    if (!orgIdToUse) return;
    
    try {
      const api = createAxiosInstance();
      const response = await api.get(`/alerts/org/${orgIdToUse}?limit=5&is_read=false`);
      
      if (response.data.alerts && response.data.alerts.length > 0) {
        setRecentAlerts(response.data.alerts);
        setShowAlertsPopup(true);
      }
    } catch (err) {
      console.error('Error checking for alerts on login:', err);
    }
  };

  const handleCloseAlertsPopup = () => {
    setShowAlertsPopup(false);
    setRecentAlerts([]);
  };

  const handleGoToAlerts = () => {
    setActiveTab('alerts');
    setShowAlertsPopup(false);
  };

  // Audit logs pagination functions
  const fetchAuditLogs = async (resetPagination = false) => {
    if (!orgIdToUse) return;
    
    try {
      const api = createAxiosInstance();
      const params = new URLSearchParams({
        limit: auditLogsPagination.limit.toString(),
        offset: resetPagination ? '0' : auditLogsPagination.offset.toString()
      });
      
      const response = await api.get(`/audit/org/${orgIdToUse}?${params}`);
      
      setAuditLogs(response.data.logs);
      setAuditLogsPagination(prev => ({
        ...prev,
        total: response.data.total_count,
        offset: resetPagination ? 0 : prev.offset,
        hasMore: response.data.has_more
      }));
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setAuditLogs([]);
    }
  };

  const handleAuditLogsPageChange = (newOffset) => {
    setAuditLogsPagination(prev => ({ ...prev, offset: newOffset }));
  };



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
    <div className="secure-container" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div className="secure-card" style={{ 
        margin: '1rem', 
        padding: '2rem',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0, 
                marginBottom: '0.5rem' 
              }}>
                Welcome to your Organization Dashboard, {user?.username}
              </h1>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '1rem', 
                margin: 0, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <Building2 size={20} />
                Organization ID: <span style={{ fontWeight: '600', color: '#1e40af' }}>{user?.organization_id}</span>
              </p>
            </div>
            <div style={{ 
              padding: '0.75rem 1.5rem', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>🔒</span>
              Secure Session Active
            </div>
          </div>
        </div>
      </div>
          {/* Tab Navigation */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem 0 2rem' }}>
        <div className="secure-card" style={{ 
          display: 'flex', 
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '0.5rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: activeTab === tab.id ? '#1e40af' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  border: activeTab === tab.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {activeTab === tab.id && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                    zIndex: 0
                  }} />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{tab.icon}</span>
                <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
              </button>
            ))}
          </div>
          {/* Tab Content */}
          <div className="secure-card" style={{ 
            padding: '2rem', 
            margin: '1rem 0',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
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
                    <div style={{ color: '#6b7280' }}>Total Contracts</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{contractStats.pending_received}</div>
                    <div style={{ color: '#6b7280' }}>Pending Contracts</div>
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
              
              {/* Search and Filter Controls */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)' 
              }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Search */}
                  <div style={{ flex: '1', minWidth: '250px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Search Users
                    </label>
                    <input
                      type="text"
                      placeholder="Search by username, name, or email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  
                  {/* Status Filter */}
                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Status
                    </label>
                    <select
                      value={userFilterStatus}
                      onChange={(e) => setUserFilterStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="all">All Users</option>
                      <option value="active">Active Users</option>
                      <option value="inactive">Inactive Users</option>
                    </select>
                  </div>
                  
                  {/* Resource Filter */}
                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Resource Type
                    </label>
                    <select
                      value={userFilterResource}
                      onChange={(e) => setUserFilterResource(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="all">All Resources</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="address">Address</option>
                      <option value="aadhaar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="bank_account">Bank Account</option>
                      <option value="credit_card">Credit Card</option>
                    </select>
                  </div>
                </div>
                
                {/* Results Summary */}
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: '#f9fafb', 
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  Showing {filteredUsers.length} of {orgUsers.length} users
                </div>
              </div>
              
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(orgUsers) || orgUsers.length === 0 ? (
                  <div style={{ color: '#d97706', textAlign: 'center', padding: '2rem' }}>
                    <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div>No users found for this organization.</div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                    <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div>No users match your search criteria.</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Try adjusting your search terms or filters.
                    </div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Username</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Full Name</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Phone</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Shared Resources</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Active Policies</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Last Consent</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Total Data Access</th>
                        <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>{u.username}</td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>{u.full_name}</td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>{u.email}</td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>{u.phone_number}</td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {Array.isArray(u.shared_resources) ? u.shared_resources.map((resource, i) => (
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
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>No resources</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: u.active_policies_count > 0 ? '#dcfce7' : '#fee2e2',
                              color: u.active_policies_count > 0 ? '#166534' : '#dc2626'
                            }}>
                              {u.active_policies_count}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            {u.last_consent_date ? new Date(u.last_consent_date).toLocaleDateString() : 'Never'}
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            {u.total_data_access_count || 0}
                          </td>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            <button
                              onClick={() => handleOpenUserPIIModal(u)}
                              disabled={userPIILoading}
                              style={{
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.5rem 0.75rem',
                                cursor: userPIILoading ? 'not-allowed' : 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                opacity: userPIILoading ? 0.6 : 1
                              }}
                            >
                              {userPIILoading ? 'Loading...' : 'View PII'}
                            </button>
                          </td>
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
                                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={handleOpenBulkRequestModal}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        fontSize: '0.875rem'
                      }}
                    >
                      <Download size={16} />
                      Bulk Request
                    </button>
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
                    {dataRequests.some(req => req.is_requester && req.status === 'approved' && new Date(req.expires_at) > new Date()) && (
                      <button
                        onClick={async () => {
                          try {
                            const api = createAxiosInstance();
                            const response = await api.get(`/data-requests/bulk-approved-data/${orgIdToUse}`);
                            
                            if (response.data && response.data.file_id) {
                              // Open the encrypted CSV file in web viewer
                              const viewUrl = `${api.defaults.baseURL}/data-requests/view-csv/${response.data.file_id}`;
                              window.open(viewUrl, '_blank', 'noopener,noreferrer');
                            }
                          } catch (err) {
                            console.error('Error generating CSV file:', err);
                            alert('Failed to generate CSV file: ' + (err.response?.data?.detail || err.message));
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          fontSize: '0.875rem'
                        }}
                      >
                        <FileText size={16} />
                        View CSV
                      </button>
                    )}
                  </div>
              </div>
              
              {/* Contract requirement notice */}
              {contractBasedOrganizations.length === 0 && (
                <div style={{ 
                  background: '#fef3c7', 
                  border: '1px solid #f59e0b', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginBottom: '1.5rem',
                  color: '#d97706'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={20} />
                    <strong>No Active Contracts Found</strong>
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    You need to establish inter-organization contracts before you can send data access requests. 
                    Go to the "Contracts" tab to create contracts with other organizations.
                  </div>
                </div>
              )}
              
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {!Array.isArray(dataRequests) || dataRequests.length === 0 ? (
                  <div style={{ color: '#d97706', textAlign: 'center', padding: '2rem' }}>
                    <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div>No data access requests found for this organization.</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {contractBasedOrganizations.length > 0 
                        ? 'Click "Create Request" to send a new data access request to a user.'
                        : 'Create contracts with other organizations first to enable data requests.'
                      }
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Type</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Request ID</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Organization</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Target User</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Resources</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Purpose</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Retention</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Status</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Created</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Expires</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', whiteSpace: 'nowrap' }}>Actions</th>
                        </tr>
                      </thead>
                    <tbody>
                      {dataRequests.map((req, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
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
                              {req.is_bulk_request && (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '8px',
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
                                  background: '#7c3aed',
                                  color: 'white',
                                  alignSelf: 'flex-start'
                                }}>
                                  Bulk ({req.bulk_request_size || req.individual_requests?.length || 'N/A'})
                                </span>
                              )}
                            </div>
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
                                {req.is_bulk_request ? (
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
                                    onClick={() => handleApproveBulkRequest(req.bulk_request_id)}
                                  >
                                    Approve Bulk
                                  </button>
                                ) : (
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
                                )}
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
                            {req.is_requester && req.status === 'approved' && new Date(req.expires_at) > new Date() && (
                              <button
                                style={{
                                  background: req.is_bulk_request ? '#059669' : '#2563eb',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.75rem',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  marginLeft: '0.5rem'
                                }}
                                onClick={() => {
                                  if (req.is_bulk_request && req.csv_file_id) {
                                    handleViewBulkData(req.csv_file_id);
                                  } else if (req.is_bulk_request) {
                                    // For bulk requests without csv_file_id, generate it
                                    alert('Bulk data export not available yet. Please contact the target organization to approve the request.');
                                  } else {
                                    handleViewApprovedData(req.request_id);
                                  }
                                }}
                              >
                                {req.is_bulk_request ? 'View Bulk Data' : 'View Data'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Inter-Organization Contracts</h2>
                <button
                  onClick={handleOpenCreateContractModal}
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
                  Create Contract
                </button>
              </div>
              
              {/* Contract Statistics */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1e40af' }}>Sent Contracts</h3>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{contractStats.total_sent}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>{contractStats.pending_sent}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pending</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{contractStats.active_sent}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{contractStats.rejected_sent}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rejected</div>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, background: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#d97706' }}>Received Contracts</h3>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>{contractStats.total_received}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>{contractStats.pending_received}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Pending</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>{contractStats.active_received}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{contractStats.rejected_received}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rejected</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contract Filter */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setContractFilter('all')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: contractFilter === 'all' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                      borderRadius: '20px',
                      background: contractFilter === 'all' ? '#dbeafe' : 'white',
                      color: contractFilter === 'all' ? '#1e40af' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    All Contracts ({contracts.length})
                  </button>
                  <button
                    onClick={() => setContractFilter('sent')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: contractFilter === 'sent' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                      borderRadius: '20px',
                      background: contractFilter === 'sent' ? '#dbeafe' : 'white',
                      color: contractFilter === 'sent' ? '#1e40af' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Sent ({contractStats.total_sent})
                  </button>
                  <button
                    onClick={() => setContractFilter('received')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: contractFilter === 'received' ? '2px solid #2563eb' : '2px solid #e5e7eb',
                      borderRadius: '20px',
                      background: contractFilter === 'received' ? '#dbeafe' : 'white',
                      color: contractFilter === 'received' ? '#1e40af' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Received ({contractStats.total_received})
                  </button>
                </div>
              </div>
              
              <div style={{ background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {(() => {
                  // Filter contracts based on selected filter
                  let filteredContracts = contracts;
                  if (contractFilter === 'sent') {
                    filteredContracts = contracts.filter(contract => contract.is_requester);
                  } else if (contractFilter === 'received') {
                    filteredContracts = contracts.filter(contract => !contract.is_requester);
                  }
                  
                  if (!Array.isArray(filteredContracts) || filteredContracts.length === 0) {
                    return (
                      <div style={{ color: '#d97706', textAlign: 'center', padding: '2rem' }}>
                        <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <div>No {contractFilter === 'all' ? '' : contractFilter} contracts found for this organization.</div>
                        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                          {contractFilter === 'all' ? 'Click "Create Contract" to establish a new data sharing agreement.' : 
                           contractFilter === 'sent' ? 'You haven\'t sent any contract requests yet.' :
                           'You haven\'t received any contract requests yet.'}
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div style={{ 
                      maxHeight: '600px', 
                      overflowY: 'auto', 
                      overflowX: 'auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Type</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Contract ID</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Contract Name</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Organization</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Resources</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Purpose</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Retention</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Status</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Created</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Expires</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left', background: '#f3f4f6' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                        {filteredContracts.map((contract, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: contract.is_requester ? '#dbeafe' : '#fef3c7',
                                color: contract.is_requester ? '#1e40af' : '#d97706'
                              }}>
                                {contract.is_requester ? 'Sent' : 'Received'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              <code style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                {contract.contract_id?.substring(0, 8)}...
                              </code>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {contract.contract_name || 'Unnamed Contract'}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {contract.is_requester ? contract.target_org_name : contract.source_org_name}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {Array.isArray(contract.resources_allowed) ? contract.resources_allowed.map((resource, i) => (
                                  <span key={i} style={{
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                  }}>
                                    {resource.resource_name}
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
                                    {contract.resources_allowed}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                              {Array.isArray(contract.resources_allowed) ? 
                                contract.resources_allowed.map(r => r.purpose).flat().join(', ') : 
                                contract.purposes ? (Array.isArray(contract.purposes) ? contract.purposes.join(', ') : contract.purposes) : 'N/A'
                              }
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                              {Array.isArray(contract.resources_allowed) ? 
                                contract.resources_allowed.map(r => r.retention_window).join(', ') : 
                                contract.retention_window || 'N/A'
                              }
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Status display */}
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  background: contract.approval_status === 'approved' ? '#dcfce7' : 
                                             contract.approval_status === 'rejected' ? '#fee2e2' : 
                                             contract.approval_status === 'pending' ? '#fef3c7' : '#f3f4f6',
                                  color: contract.approval_status === 'approved' ? '#166534' : 
                                         contract.approval_status === 'rejected' ? '#dc2626' : 
                                         contract.approval_status === 'pending' ? '#d97706' : '#6b7280'
                                }}>
                                  {contract.approval_status || 'Unknown'}
                                </span>
                                
                                {/* Contract status */}
                                {contract.status && (
                                  <span style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    background: contract.status === 'active' ? '#dcfce7' : 
                                               contract.status === 'expired' ? '#fee2e2' : 
                                               contract.status === 'deleted' ? '#fee2e2' : '#f3f4f6',
                                    color: contract.status === 'active' ? '#166534' : 
                                           contract.status === 'expired' ? '#dc2626' : 
                                           contract.status === 'deleted' ? '#dc2626' : '#6b7280'
                                  }}>
                                    {contract.status}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {new Date(contract.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {new Date(contract.ends_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Approval/Rejection buttons for pending contracts */}
                                {contract.approval_status === 'pending' && !contract.is_requester ? (
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
                                      onClick={() => handleApproveContract(contract.contract_id)}
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
                                      onClick={() => handleRejectContract(contract.contract_id)}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : null}
                                
                                {/* Action buttons for active contracts */}
                                {contract.status === 'active' && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {/* Edit Contract */}
                                    <button
                                      style={{
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                      }}
                                      onClick={() => handleOpenEditContractModal(contract)}
                                      title="Edit Contract"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    
                                    {/* Delete Contract */}
                                    <button
                                      style={{
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                      }}
                                      onClick={() => handleOpenDeleteContractModal(contract)}
                                      title="Delete Contract"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                    
                                    {/* View Versions */}
                                    <button
                                      style={{
                                        background: '#059669',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                      }}
                                      onClick={() => handleOpenContractVersionsModal(contract)}
                                      title="View Versions"
                                    >
                                      <History size={12} />
                                    </button>
                                    
                                    {/* View Audit Logs */}
                                    <button
                                      style={{
                                        background: '#d97706',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                      }}
                                      onClick={() => handleOpenContractAuditModal(contract)}
                                      title="View Audit Logs"
                                    >
                                      <FileText size={12} />
                                    </button>
                                  </div>
                                )}
                                
                                {/* Action approval buttons for pending actions */}
                                {(contract.is_update_request || contract.is_deletion_request) && 
                                 ((contract.is_update_request && contract.requested_by_org_id !== orgIdToUse) ||
                                  (contract.is_deletion_request && contract.requested_by_org_id !== orgIdToUse)) ? (
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
                                      onClick={() => handleApproveContractAction(
                                        contract.contract_id, 
                                        contract.is_update_request ? 'update' : 'delete'
                                      )}
                                    >
                                      Approve {contract.is_update_request ? 'Update' : 'Deletion'}
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
                                      onClick={() => handleRejectContractAction(
                                        contract.contract_id, 
                                        contract.is_update_request ? 'update' : 'delete'
                                      )}
                                    >
                                      Reject {contract.is_update_request ? 'Update' : 'Deletion'}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          {activeTab === 'contract_logs' && (
            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: '2rem', marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Contract Logs</h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                Showing logs for active contracts only. Deleted contracts are excluded from this view.
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Contract ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Contract Name</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Action Type</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Created At</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Source Org</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Target Org</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {contractLogs.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>No contract logs found.</td></tr>
                  ) : (
                    contractLogs.map(log => (
                      <tr key={log._id}>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{log.contract_id}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{log.contract_name || 'N/A'}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            background: log.log_type === 'contract_creation' ? '#dcfce7' : 
                                       log.log_type === 'contract_update' ? '#dbeafe' :
                                       log.log_type === 'contract_deletion' ? '#fef3c7' : '#f3f4f6',
                            color: log.log_type === 'contract_creation' ? '#166534' :
                                   log.log_type === 'contract_update' ? '#1e40af' :
                                   log.log_type === 'contract_deletion' ? '#92400e' : '#6b7280'
                          }}>
                            {log.log_type === 'contract_creation' ? 'Creation' : 
                             log.log_type === 'contract_update' ? 'Update' :
                             log.log_type === 'contract_deletion' ? 'Deletion' : log.log_type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{log.source_org_id}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>{log.target_org_id}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                          {log.deletion_reason && <div><strong>Reason:</strong> {log.deletion_reason}</div>}
                          {log.update_reason && <div><strong>Reason:</strong> {log.update_reason}</div>}
                          {log.update_version && <div><strong>Version:</strong> {log.update_version}</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'audit_logs' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Shield size={24} style={{ color: '#3b82f6' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Audit Logs</h2>
                <div style={{ 
                  padding: '0.25rem 0.75rem', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#3b82f6', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: '600' 
                }}>
                  Security & Compliance
                </div>
              </div>
              
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                {!Array.isArray(auditLogs) || auditLogs.length === 0 ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No Audit Logs Found</div>
                    <div style={{ fontSize: '0.875rem' }}>No audit logs have been generated for this organization yet.</div>
                  </div>
                ) : (
                  <div>
                    <AuditLogTable logs={auditLogs} />
                    
                    {/* Pagination */}
                    {auditLogsPagination.total > auditLogsPagination.limit && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Showing {auditLogsPagination.offset + 1} to {Math.min(auditLogsPagination.offset + auditLogsPagination.limit, auditLogsPagination.total)} of {auditLogsPagination.total} logs
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleAuditLogsPageChange(Math.max(0, auditLogsPagination.offset - auditLogsPagination.limit))}
                            disabled={auditLogsPagination.offset === 0}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: 'white',
                              cursor: auditLogsPagination.offset === 0 ? 'not-allowed' : 'pointer',
                              opacity: auditLogsPagination.offset === 0 ? 0.5 : 1
                            }}
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handleAuditLogsPageChange(auditLogsPagination.offset + auditLogsPagination.limit)}
                            disabled={!auditLogsPagination.hasMore}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: 'white',
                              cursor: auditLogsPagination.hasMore ? 'pointer' : 'not-allowed',
                              opacity: auditLogsPagination.hasMore ? 1 : 0.5
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'alerts' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <AlertCircle size={24} style={{ color: '#dc2626' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Security Alerts</h2>
                <div style={{ 
                  padding: '0.25rem 0.75rem', 
                  background: 'rgba(220, 38, 38, 0.1)', 
                  color: '#dc2626', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: '600' 
                }}>
                  Suspicious Activity Detection
                </div>
                {unreadAlertsCount > 0 && (
                  <div style={{ 
                    padding: '0.25rem 0.75rem', 
                    background: '#dc2626', 
                    color: 'white', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: '600' 
                  }}>
                    {unreadAlertsCount} New
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                {unreadAlertsCount > 0 && (
                  <button
                    onClick={handleMarkAllAlertsAsRead}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    <CheckCircle size={16} />
                    Mark All as Read
                  </button>
                )}
              </div>

              {/* Filters */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)' 
              }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Alert Type
                    </label>
                    <select
                      value={alertsFilters.alert_type}
                      onChange={(e) => handleAlertsFilterChange('alert_type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">All Types</option>
                      <option value="failed_login">Failed Login</option>
                      <option value="multiple_requests">Multiple Requests</option>
                      <option value="foreign_access">Foreign Access</option>
                      <option value="suspicious_activity">Suspicious Activity</option>
                      <option value="data_breach">Data Breach</option>
                      <option value="unusual_pattern">Unusual Pattern</option>
                    </select>
                  </div>
                  
                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Severity
                    </label>
                    <select
                      value={alertsFilters.severity}
                      onChange={(e) => handleAlertsFilterChange('severity', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">All Severities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Status
                    </label>
                    <select
                      value={alertsFilters.is_read === null ? "" : alertsFilters.is_read.toString()}
                      onChange={(e) => handleAlertsFilterChange('is_read', e.target.value === "" ? null : e.target.value === "true")}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">All Alerts</option>
                      <option value="false">Unread</option>
                      <option value="true">Read</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Blocked IPs Section */}
              <div style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Shield size={20} style={{ color: '#dc2626' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>Blocked IP Addresses</h3>
                </div>
                
                {blockedIPs.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                    No IP addresses are currently blocked.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {blockedIPs.map((ip, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}>
                        <span style={{ color: '#dc2626', fontWeight: '500' }}>{ip}</span>
                        <button
                          onClick={() => handleUnblockIP(ip)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '0.25rem'
                          }}
                          title="Unblock IP"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alerts List */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                {alertsLoading ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>Loading alerts...</div>
                  </div>
                ) : alertsError ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#dc2626',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: '500' }}>Error: {alertsError}</div>
                  </div>
                ) : !Array.isArray(alerts) || alerts.length === 0 ? (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No Alerts Found</div>
                    <div style={{ fontSize: '0.875rem' }}>No security alerts have been generated for this organization yet.</div>
                  </div>
                ) : (
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Severity</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Description</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Location</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>IP Address</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Created</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb', textAlign: 'left' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map((alert, idx) => (
                          <tr key={idx} style={{ 
                            borderBottom: '1px solid #f3f4f6',
                            background: alert.is_read ? 'white' : 'rgba(220, 38, 38, 0.05)'
                          }}>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={16} style={{ 
                                  color: alert.severity === 'critical' ? '#dc2626' : 
                                         alert.severity === 'high' ? '#ea580c' : 
                                         alert.severity === 'medium' ? '#d97706' : '#059669'
                                }} />
                                {alert.alert_type_display}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: alert.severity === 'critical' ? '#fee2e2' : 
                                           alert.severity === 'high' ? '#fed7aa' : 
                                           alert.severity === 'medium' ? '#fef3c7' : '#d1fae5',
                                color: alert.severity === 'critical' ? '#dc2626' : 
                                       alert.severity === 'high' ? '#ea580c' : 
                                       alert.severity === 'medium' ? '#d97706' : '#059669'
                              }}>
                                {alert.severity}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {alert.description}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {alert.location?.city}, {alert.location?.country}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {alert.ip_address || 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              {new Date(alert.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: alert.is_read ? '#d1fae5' : '#fee2e2',
                                color: alert.is_read ? '#059669' : '#dc2626'
                              }}>
                                {alert.is_read ? 'Read' : 'Unread'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {!alert.is_read && (
                                  <button
                                    onClick={() => handleMarkAlertAsRead(alert.id)}
                                    style={{
                                      background: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.5rem 0.75rem',
                                      cursor: 'pointer',
                                      fontSize: '0.75rem',
                                      fontWeight: '500'
                                    }}
                                  >
                                    Mark Read
                                  </button>
                                )}
                                {alert.ip_address && alert.ip_address !== 'N/A' && (
                                  <button
                                    onClick={() => handleBlockIP(alert.ip_address)}
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
                                  >
                                    Block IP
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteAlert(alert.id)}
                                  style={{
                                    background: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '0.5rem 0.75rem',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '500'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {alertsPagination.total > alertsPagination.limit && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Showing {alertsPagination.offset + 1} to {Math.min(alertsPagination.offset + alertsPagination.limit, alertsPagination.total)} of {alertsPagination.total} alerts
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleAlertsPageChange(Math.max(0, alertsPagination.offset - alertsPagination.limit))}
                            disabled={alertsPagination.offset === 0}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: 'white',
                              cursor: alertsPagination.offset === 0 ? 'not-allowed' : 'pointer',
                              opacity: alertsPagination.offset === 0 ? 0.5 : 1
                            }}
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => handleAlertsPageChange(alertsPagination.offset + alertsPagination.limit)}
                            disabled={!alertsPagination.hasMore}
                            style={{
                              padding: '0.5rem 1rem',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              background: 'white',
                              cursor: alertsPagination.hasMore ? 'pointer' : 'not-allowed',
                              opacity: alertsPagination.hasMore ? 1 : 0.5
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'file_sharing' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <FileText size={24} style={{ color: '#3b82f6' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>File Sharing</h2>
                <div style={{ 
                  padding: '0.25rem 0.75rem', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  color: '#3b82f6', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: '600' 
                }}>
                  Secure PDF Sharing
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                  onClick={handleOpenFileRequestModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  <Plus size={16} />
                  Request File
                </button>
                <button
                  onClick={handleOpenDirectShareModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  <FileText size={16} />
                  Send File
                </button>
              </div>

              {/* File Requests Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                  File Requests ({fileRequests.length})
                </h3>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {fileRequests.length === 0 ? (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#6b7280',
                      background: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No File Requests</div>
                      <div style={{ fontSize: '0.875rem' }}>No file requests have been made yet.</div>
                    </div>
                  ) : (
                    <div style={{ overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Description</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Category</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Status</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>From/To</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Created</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fileRequests.map((request) => (
                            <tr key={request.request_id} style={{ borderBottom: '1px solid rgba(243, 244, 246, 0.8)' }}>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                                  {request.file_description}
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  background: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  {request.file_category}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  background: request.status === 'pending' ? '#fef3c7' : 
                                             request.status === 'approved' ? '#dcfce7' :
                                             request.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                                  color: request.status === 'pending' ? '#92400e' :
                                         request.status === 'approved' ? '#166534' :
                                         request.status === 'rejected' ? '#dc2626' : '#6b7280'
                                }}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {request.is_requester ? 
                                    `To: ${request.target_org_name}` : 
                                    `From: ${request.requester_org_name}`
                                  }
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {new Date(request.created_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  {!request.is_requester && request.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleApproveFileRequest(request.request_id)}
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          background: '#10b981',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectFileRequest(request.request_id)}
                                        style={{
                                          padding: '0.25rem 0.5rem',
                                          background: '#dc2626',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {request.status === 'approved' && !request.uploaded_file_id && !request.is_requester && (
                                    <button
                                      onClick={() => handleOpenUploadFileModal(request)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem'
                                      }}
                                    >
                                      Upload
                                    </button>
                                  )}
                                  {request.uploaded_file_id && (
                                    <button
                                      onClick={() => handleViewFile(request.uploaded_file_id)}
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        background: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem'
                                      }}
                                    >
                                      View
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Files Section */}
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                  Shared Files ({sharedFiles.length})
                </h3>
                <div style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden'
                }}>
                  {sharedFiles.length === 0 ? (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      color: '#6b7280',
                      background: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No Shared Files</div>
                      <div style={{ fontSize: '0.875rem' }}>No files have been shared yet.</div>
                    </div>
                  ) : (
                    <div style={{ overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>File Name</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Description</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Category</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Size</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>From/To</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Uploaded</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600', color: '#374151' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sharedFiles.map((file) => (
                            <tr key={file.file_id} style={{ borderBottom: '1px solid rgba(243, 244, 246, 0.8)' }}>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                                  {file.file_name}
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {file.file_description}
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  background: '#dbeafe',
                                  color: '#1e40af'
                                }}>
                                  {file.file_category}
                                </span>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {file.is_sender ? 
                                    `To: ${file.receiver_org_name}` : 
                                    `From: ${file.sender_org_name}`
                                  }
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  {new Date(file.uploaded_at).toLocaleDateString()}
                                </div>
                              </td>
                              <td style={{ padding: '1rem' }}>
                                <button
                                  onClick={() => handleViewFile(file.file_id)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    background: '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
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
                  <option value="">Select an organization with active contract...</option>
                  {contractBasedOrganizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.org_id}) - {org.allowed_resources.length} resources available
                    </option>
                  ))}
                </select>
                {contractBasedOrganizations.length === 0 && (
                  <div style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    No organizations with active contracts found. Please create contracts first.
                  </div>
                )}
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
                  Requested Resources * (Contract Restricted)
                </label>
                {selectedOrgContractData && (
                  <div style={{ 
                    background: '#f0f9ff', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                  }}>
                    <strong>Contract with {selectedOrgContractData.org_name}:</strong> You can only request resources that are allowed by your active contract.
                  </div>
                )}
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
                {availableResources.length === 0 && selectedOrgId && (
                  <div style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    No resources available for this organization in the active contract.
                  </div>
                )}
                {requestForm.requested_resources.length === 0 && availableResources.length > 0 && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Please select at least one resource
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Purpose * (Contract Restricted)
                </label>
                {selectedOrgContractData && requestForm.requested_resources.length > 0 && (
                  <div style={{ 
                    background: '#f0f9ff', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#1e40af'
                  }}>
                    <strong>Available purposes for selected resources:</strong> Only purposes allowed by the contract for your selected resources are available.
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {getAvailablePurposesForSelectedResources().map((purpose) => (
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
                {getAvailablePurposesForSelectedResources().length === 0 && requestForm.requested_resources.length > 0 && (
                  <div style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    No purposes available for the selected resources in the contract.
                  </div>
                )}
                {requestForm.purpose.length === 0 && getAvailablePurposesForSelectedResources().length > 0 && (
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

      {/* Create Contract Modal */}
      {showCreateContractModal && (
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Create Inter-Organization Contract</h2>
              <button
                onClick={handleCloseCreateContractModal}
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

            {createContractError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {createContractError}
              </div>
            )}

            <form onSubmit={handleCreateContract}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Organization *
                </label>
                <select
                  value={contractForm.target_org_id}
                  onChange={(e) => handleContractFormChange('target_org_id', e.target.value)}
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
                  {allOrganizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.org_id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Name *
                </label>
                <input
                  type="text"
                  value={contractForm.contract_name}
                  onChange={(e) => handleContractFormChange('contract_name', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Enter contract name (e.g., Contract with BankABC - 7/18/2025)"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Type *
                </label>
                <select
                  value={contractForm.contract_type}
                  onChange={(e) => handleContractFormChange('contract_type', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  {contractTypes.map((type) => (
                    <option key={type.type_id} value={type.type_id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Description
                </label>
                <textarea
                  value={contractForm.contract_description}
                  onChange={(e) => handleContractFormChange('contract_description', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Describe the purpose and scope of this contract"
                />
              </div>

              {contractForm.contract_type !== "file_sharing" && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Add Resources to Contract
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <select
                    value={contractResourceForm.resource_name}
                    onChange={(e) => handleContractResourceFormChange('resource_name', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select a resource...</option>
                    {availableContractResources.map((resource) => (
                      <option key={resource} value={resource}>
                        {resource.charAt(0).toUpperCase() + resource.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={contractResourceForm.retention_window}
                    onChange={(e) => handleContractResourceFormChange('retention_window', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="7 days">7 days</option>
                    <option value="15 days">15 days</option>
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                    <option value="1 year">1 year</option>
                    <option value="2 years">2 years</option>
                    <option value="5 years">5 years</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availablePurposes.map((purpose) => (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => handleContractResourcePurposeToggle(purpose)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: contractResourceForm.purpose.includes(purpose) 
                          ? '2px solid #2563eb' 
                          : '2px solid #e5e7eb',
                        borderRadius: '20px',
                        background: contractResourceForm.purpose.includes(purpose) 
                          ? '#dbeafe' 
                          : 'white',
                        color: contractResourceForm.purpose.includes(purpose) 
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
                {contractResourceForm.resource_name === "" || contractResourceForm.purpose.length === 0 ? (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Please select a resource and at least one purpose
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddContractResource}
                    style={{
                      marginTop: '1rem',
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #2563eb',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Add Resource
                  </button>
                )}
              </div>
              )}

              {contractForm.contract_type === "file_sharing" && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: '#0c4a6e'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                      File Sharing Contract
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      This contract will automatically include all supported file types (Excel, PDF, DOC, DOCX, CSV, JSON, XML) 
                      with 90-day retention period for document sharing and compliance reporting purposes.
                    </div>
                  </div>
                </div>
              )}

              {contractForm.contract_type !== "file_sharing" && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Resources
                </label>
                {!contractForm.resources_allowed || contractForm.resources_allowed.length === 0 ? (
                  <div style={{ color: '#d97706', fontSize: '0.875rem' }}>No resources added to this contract yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(contractForm.resources_allowed || []).map((resource, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: '#f9fafb',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>{resource.resource_name}</span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>({resource.retention_window})</span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>({Array.isArray(resource.purpose) ? resource.purpose.join(', ') : resource.purpose || 'No purpose specified'})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveContractResource(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '1rem'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {contractForm.contract_type === "file_sharing" && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    File Sharing Resources
                  </label>
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#0c4a6e' }}>
                      Supported File Types:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {['Excel', 'PDF', 'DOC', 'DOCX', 'CSV', 'JSON', 'XML'].map((fileType) => (
                        <span key={fileType} style={{
                          background: '#0ea5e9',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {fileType}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>
                      <strong>Retention:</strong> 90 days<br/>
                      <strong>Purposes:</strong> Document sharing, Compliance reporting
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Approval Message (Optional)
                </label>
                <textarea
                  value={contractForm.approval_message}
                  onChange={(e) => handleContractFormChange('approval_message', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Add a message for the target organization to approve or reject the contract."
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseCreateContractModal}
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
                  disabled={createContractLoading || contractForm.target_org_id === "" || contractForm.contract_name.trim() === "" || (contractForm.contract_type !== "file_sharing" && contractForm.resources_allowed.length === 0)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: createContractLoading || contractForm.target_org_id === "" || contractForm.contract_name.trim() === "" || (contractForm.contract_type !== "file_sharing" && contractForm.resources_allowed.length === 0)
                      ? '#9ca3af' 
                      : '#2563eb',
                    color: 'white',
                    cursor: createContractLoading || contractForm.target_org_id === "" || contractForm.contract_name.trim() === "" || (contractForm.contract_type !== "file_sharing" && contractForm.resources_allowed.length === 0)
                      ? 'not-allowed' 
                      : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {createContractLoading ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {showEditContractModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                Edit Contract: {selectedContract?.contract_name || selectedContract?.contract_id}
              </h2>
              <button
                onClick={handleCloseEditContractModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {contractActionError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {contractActionError}
              </div>
            )}

            <form onSubmit={handleEditContract}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Name *
                </label>
                <input
                  type="text"
                  value={editContractForm.contract_name}
                  onChange={(e) => handleEditContractFormChange('contract_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Enter contract name"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Type
                </label>
                <select
                  value={editContractForm.contract_type}
                  onChange={(e) => handleEditContractFormChange('contract_type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  {contractTypes.map((type) => (
                    <option key={type.type_id} value={type.type_id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract Description
                </label>
                <textarea
                  value={editContractForm.contract_description}
                  onChange={(e) => handleEditContractFormChange('contract_description', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Describe the purpose and scope of this contract"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Update Resources
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <select
                    value={contractResourceForm.resource_name}
                    onChange={(e) => handleEditContractResourceFormChange('resource_name', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select a resource...</option>
                    {availableContractResources.map((resource) => (
                      <option key={resource} value={resource}>
                        {resource.charAt(0).toUpperCase() + resource.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={contractResourceForm.retention_window}
                    onChange={(e) => handleEditContractResourceFormChange('retention_window', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="7 days">7 days</option>
                    <option value="15 days">15 days</option>
                    <option value="30 days">30 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                    <option value="1 year">1 year</option>
                    <option value="2 years">2 years</option>
                    <option value="5 years">5 years</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availablePurposes.map((purpose) => (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => handleContractResourcePurposeToggle(purpose)}
                      style={{
                        padding: '0.5rem 1rem',
                        border: contractResourceForm.purpose.includes(purpose) 
                          ? '2px solid #2563eb' 
                          : '2px solid #e5e7eb',
                        borderRadius: '20px',
                        background: contractResourceForm.purpose.includes(purpose) 
                          ? '#dbeafe' 
                          : 'white',
                        color: contractResourceForm.purpose.includes(purpose) 
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
                {contractResourceForm.resource_name === "" || contractResourceForm.purpose.length === 0 ? (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    Please select a resource and at least one purpose
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddEditContractResource}
                    style={{
                      marginTop: '1rem',
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #2563eb',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Add Resource
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Current Resources
                </label>
                {!editContractForm.resources_allowed || editContractForm.resources_allowed.length === 0 ? (
                  <div style={{ color: '#d97706', fontSize: '0.875rem' }}>No resources in this contract.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(editContractForm.resources_allowed || []).map((resource, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: '#f9fafb',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <span style={{ fontWeight: '500', color: '#111827' }}>{resource.resource_name}</span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>({resource.retention_window})</span>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>({Array.isArray(resource.purpose) ? resource.purpose.join(', ') : resource.purpose || 'No purpose specified'})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditContractResource(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '1rem'
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Update Message (Optional)
                </label>
                <textarea
                  value={editContractForm.approval_message}
                  onChange={(e) => handleEditContractFormChange('approval_message', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Add a message explaining the changes for the other organization."
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseEditContractModal}
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
                  disabled={contractActionLoading || editContractForm.contract_name.trim() === "" || editContractForm.resources_allowed.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: contractActionLoading || editContractForm.contract_name.trim() === "" || editContractForm.resources_allowed.length === 0 
                      ? '#9ca3af' 
                      : '#2563eb',
                    color: 'white',
                    cursor: contractActionLoading || editContractForm.contract_name.trim() === "" || editContractForm.resources_allowed.length === 0 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {contractActionLoading ? 'Updating...' : 'Request Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Contract Modal */}
      {showDeleteContractModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                Delete Contract: {selectedContract?.contract_name || selectedContract?.contract_id}
              </h2>
              <button
                onClick={handleCloseDeleteContractModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {contractActionError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {contractActionError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                background: '#fef3c7',
                color: '#d97706',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <AlertTriangle size={20} style={{ marginBottom: '0.5rem' }} />
                <strong>Warning:</strong> This action will request deletion of the contract. The other organization must approve this request before the contract is actually deleted.
              </div>
            </div>

            <form onSubmit={handleDeleteContract}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Deletion Reason *
                </label>
                <textarea
                  value={deleteContractForm.deletion_reason}
                  onChange={(e) => handleDeleteContractFormChange('deletion_reason', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Please provide a reason for deleting this contract"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Additional Message (Optional)
                </label>
                <textarea
                  value={deleteContractForm.approval_message}
                  onChange={(e) => handleDeleteContractFormChange('approval_message', e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Add any additional message for the other organization"
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseDeleteContractModal}
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
                  disabled={contractActionLoading || deleteContractForm.deletion_reason.trim() === ""}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: contractActionLoading || deleteContractForm.deletion_reason.trim() === "" 
                      ? '#9ca3af' 
                      : '#dc2626',
                    color: 'white',
                    cursor: contractActionLoading || deleteContractForm.deletion_reason.trim() === "" 
                      ? 'not-allowed' 
                      : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {contractActionLoading ? 'Requesting...' : 'Request Deletion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Versions Modal */}
      {showContractVersionsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                Contract Versions: {selectedContract?.contract_name || selectedContract?.contract_id}
              </h2>
              <button
                onClick={() => setShowContractVersionsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!contractVersions || contractVersions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <History size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <div>No version history found for this contract.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Array.isArray(contractVersions) ? contractVersions.map((version, index) => (
                  <div key={version.version_id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    background: '#f9fafb'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '600', color: '#111827' }}>
                          Version {version.version_number}
                        </span>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: version.approval_status === 'approved' ? '#dcfce7' : 
                                     version.approval_status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: version.approval_status === 'approved' ? '#166534' : 
                                 version.approval_status === 'rejected' ? '#dc2626' : '#d97706'
                        }}>
                          {version.approval_status}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Name:</strong> {version.contract_name}
                    </div>
                    
                    {version.contract_description && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Description:</strong> {version.contract_description}
                      </div>
                    )}
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Type:</strong> {version.contract_type}
                    </div>
                    
                    {version.change_summary && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Change Summary:</strong> {version.change_summary}
                      </div>
                    )}
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Resources:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                        {version.resources_allowed && Array.isArray(version.resources_allowed) ? version.resources_allowed.map((resource, i) => (
                          <span key={i} style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {resource.resource_name}
                          </span>
                        )) : (
                          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>No resources specified</span>
                        )}
                      </div>
                    </div>
                    
                    {version.rejection_reason && (
                      <div style={{ 
                        background: '#fee2e2', 
                        color: '#dc2626', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}>
                        <strong>Rejection Reason:</strong> {version.rejection_reason}
                      </div>
                    )}
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                    No versions available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract Audit Logs Modal */}
      {showContractAuditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                Contract Audit Logs: {selectedContract?.contract_name || selectedContract?.contract_id}
              </h2>
              <button
                onClick={() => setShowContractAuditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {!contractAuditLogs || contractAuditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <div>No audit logs found for this contract.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Timestamp</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>User ID</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Organization</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>IP Address</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(contractAuditLogs) ? contractAuditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          background: log.action_type.includes('approved') ? '#dcfce7' : 
                                     log.action_type.includes('rejected') ? '#fee2e2' : '#dbeafe',
                          color: log.action_type.includes('approved') ? '#166534' : 
                                 log.action_type.includes('rejected') ? '#dc2626' : '#1e40af'
                        }}>
                          {log.action_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        {log.action_by}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        {log.action_by_org_id}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        {log.ip_address || 'N/A'}
                      </td>
                      <td style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                        <details>
                          <summary style={{ cursor: 'pointer', fontSize: '0.875rem' }}>View Details</summary>
                          <pre style={{ 
                            marginTop: '0.5rem', 
                            fontSize: '0.75rem', 
                            background: '#f9fafb', 
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            overflow: 'auto'
                          }}>
                            {JSON.stringify(log.action_details, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
                        No audit logs available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* User PII Modal */}
      {showUserPIIModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                User PII Data
              </h2>
              <button
                onClick={handleCloseUserPIIModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {userPIILoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '1rem', color: '#6b7280' }}>Loading user PII data...</div>
              </div>
            ) : selectedUserPII ? (
              <div>
                {/* User Info */}
                <div style={{ 
                  background: '#f9fafb', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem' 
                }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    User Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <strong>Username:</strong> {selectedUserPII.username}
                    </div>
                    <div>
                      <strong>Full Name:</strong> {selectedUserPII.full_name}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedUserPII.email}
                    </div>
                  </div>
                </div>

                {/* PII Data */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    PII Data Shared
                  </h3>
                  {selectedUserPII.pii && selectedUserPII.pii.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {selectedUserPII.pii.map((piiItem, index) => (
                        <div key={index} style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1rem',
                          background: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#1e40af' }}>{piiItem.resource}</strong>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: '#dcfce7',
                              color: '#166534'
                            }}>
                              Shared
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            <strong>Original Value:</strong> {piiItem.original || 'Not available'}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            <strong>Tokenized Value:</strong> {piiItem.token}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            <strong>Created:</strong> {new Date(piiItem.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem', 
                      color: '#6b7280',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <div>No PII data has been shared for this user.</div>
                    </div>
                  )}
                </div>

                {/* Active Policies */}
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Active Policies
                  </h3>
                  {selectedUserPII.active_policies && selectedUserPII.active_policies.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {selectedUserPII.active_policies.map((policy, index) => (
                        <div key={index} style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '1rem',
                          background: '#f9fafb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong style={{ color: '#1e40af' }}>{policy.resource_name}</strong>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              background: policy.status === 'active' ? '#dcfce7' : '#fef3c7',
                              color: policy.status === 'active' ? '#166534' : '#92400e'
                            }}>
                              {policy.status === 'active' ? 'Active' : 'Revoked'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            <strong>Purpose:</strong> {Array.isArray(policy.purpose) ? policy.purpose.join(', ') : policy.purpose}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            <strong>Created:</strong> {new Date(policy.created_at).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            <strong>Expires:</strong> {new Date(policy.expiry).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '2rem', 
                      color: '#6b7280',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                      <div>No active policies found for this user.</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <AlertTriangle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <div>Failed to load user PII data.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showApprovedDataModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', minWidth: 400, maxWidth: 600, boxShadow: '0 2px 16px #0002', position: 'relative' }}>
            <button onClick={handleCloseApprovedDataModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2563eb' }}>Approved PII Data</h2>
            {approvedDataLoading ? (
              <div style={{ color: '#2563eb', textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : approvedDataError ? (
              <div style={{ color: '#dc2626', textAlign: 'center', padding: '2rem' }}>{approvedDataError}</div>
            ) : approvedData ? (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Full Name:</strong> {approvedData.user_info.full_name}<br />
                  <strong>Email:</strong> {approvedData.user_info.email}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>PII Data:</strong>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {approvedData.pii_data.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 500, color: '#1e40af' }}>{item.resource}:</span> {item.value}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Active Policies:</strong>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {approvedData.active_policies.map((policy, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 500 }}>{policy.resource_name}</span> - Purpose: {Array.isArray(policy.purpose) ? policy.purpose.join(', ') : policy.purpose}, Retention: {policy.retention_window}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Bulk Request Modal */}
      {showBulkRequestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', minWidth: 600, maxWidth: 900, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 2px 16px #0002', position: 'relative' }}>
            <button onClick={handleCloseBulkRequestModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#059669' }}>Create Bulk Data Requests</h2>
            
            <form onSubmit={handleBulkRequestSubmit}>
              {/* Target Organization */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Organization *
                </label>
                <select
                  value={bulkRequestForm.target_org_id}
                  onChange={(e) => handleTargetOrgChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select organization with active contract...</option>
                  {contractBasedOrganizations.map(org => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.org_id}) - {org.allowed_resources.length} resources available
                    </option>
                  ))}
                </select>
                {contractBasedOrganizations.length === 0 && (
                  <div style={{ color: '#d97706', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    No organizations with active contracts found. Please create contracts first.
                  </div>
                )}
              </div>

              {/* User Selection - Only show if target org is selected */}
              {bulkRequestForm.target_org_id && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Select Users from {contractBasedOrganizations.find(org => org.org_id === bulkRequestForm.target_org_id)?.org_name} ({selectedUsersForBulk.length} selected)
                  </label>
                  {targetOrgUsers.length > 0 ? (
                    <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem' }}>
                      {targetOrgUsers.map(user => {
                        const uniqueId = `${user.user_id}_${user.email}`;
                        return (
                          <label key={uniqueId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                            <input
                              type="checkbox"
                              checked={selectedUsersForBulk.includes(uniqueId)}
                              onChange={(e) => handleUserSelectionForBulk(uniqueId, e.target.checked)}
                              style={{ margin: 0 }}
                            />
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user.full_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user.email}</div>
                              <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>ID: {user.user_id}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px', textAlign: 'center', color: '#6b7280' }}>
                      Loading users...
                    </div>
                  )}
                </div>
              )}

              {/* Resources - Only show if target org is selected */}
              {bulkRequestForm.target_org_id && targetOrgContracts.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Available Resources (from contracts)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                    {Array.from(new Set(targetOrgContracts.flatMap(contract => 
                      contract.resources_allowed?.map(r => typeof r === 'object' ? r.resource_name : r) || []
                    ))).map(resource => (
                      <label key={resource} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={bulkRequestForm.selected_resources.includes(resource)}
                          onChange={() => handleBulkResourceToggle(resource)}
                          style={{ margin: 0 }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{resource}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Purposes - Only show if resources are selected */}
              {bulkRequestForm.selected_resources.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Available Purposes (from contracts)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {Array.from(new Set(targetOrgContracts.flatMap(contract => 
                      contract.resources_allowed?.flatMap(r => 
                        typeof r === 'object' && r.purpose ? r.purpose : []
                      ) || []
                    ))).map(purpose => (
                      <label key={purpose} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={bulkRequestForm.selected_purposes.includes(purpose)}
                          onChange={() => handleBulkPurposeToggle(purpose)}
                          style={{ margin: 0 }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{purpose}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Retention Window */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Retention Window
                </label>
                <select
                  value={bulkRequestForm.retention_window}
                  onChange={(e) => handleBulkFormChange('retention_window', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="7 days">7 days</option>
                  <option value="30 days">30 days</option>
                  <option value="90 days">90 days</option>
                  <option value="1 year">1 year</option>
                </select>
              </div>

              {/* Request Message */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Request Message (Optional)
                </label>
                <textarea
                  value={bulkRequestForm.request_message}
                  onChange={(e) => handleBulkFormChange('request_message', e.target.value)}
                  placeholder="Add a message explaining the purpose of these requests..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Error Message */}
              {bulkRequestError && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '0.875rem' }}>
                  {bulkRequestError}
                </div>
              )}

              {/* Submit Button */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseBulkRequestModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
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
                  disabled={bulkRequestLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: bulkRequestLoading ? '#9ca3af' : '#059669',
                    color: 'white',
                    cursor: bulkRequestLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {bulkRequestLoading ? 'Creating Requests...' : `Create ${selectedUsersForBulk.length} Requests`}
                </button>
              </div>
            </form>

            {/* Info */}
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0369a1' }}>
                Bulk Request Information
              </h4>
              <div style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  This will create individual data requests for each selected user. When approved, 
                  the data will be shared through a secure CSV file with detokenized PII data.
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>Selected:</strong> {selectedUsersForBulk.length} users | 
                  <strong> Resources:</strong> {bulkRequestForm.selected_resources.length} | 
                  <strong> Purposes:</strong> {bulkRequestForm.selected_purposes.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Data Modal */}
      {showBulkDataModal && (
        <div className="secure-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}>
          <div className="secure-modal-content" style={{
            padding: '2rem',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '1200px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <button 
              onClick={handleCloseBulkDataModal} 
              style={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                background: 'none', 
                border: 'none', 
                fontSize: 20, 
                cursor: 'pointer', 
                color: '#6b7280' 
              }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669' }}>
                🔒 Secure CSV Data Viewer
              </h2>
            </div>
            
            {bulkDataLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div>Loading encrypted data...</div>
              </div>
            ) : bulkDataError ? (
              <div style={{ 
                padding: '1rem', 
                background: '#fee2e2', 
                color: '#dc2626', 
                borderRadius: '6px', 
                fontSize: '0.875rem' 
              }}>
                {bulkDataError}
              </div>
            ) : bulkDataUrl ? (
              <div style={{ height: '70vh', position: 'relative' }}>
                <div className="security-warning" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <strong>SECURITY NOTICE:</strong> This is a read-only view. Copying, downloading, or editing is disabled for data protection.
                    <br />
                    <small style={{ opacity: 0.8 }}>Screenshots and screen recording are also prevented for enhanced security.</small>
                  </div>
                </div>
                
                <iframe
                  src={bulkDataUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    marginTop: '3rem'
                  }}
                  title="Bulk Data Viewer"
                  
                />
              </div>
            ) : null}
            
            <div className="secure-card" style={{ 
              marginTop: '1rem', 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px', 
              border: '1px solid #bae6fd',
              fontSize: '0.875rem',
              color: '#0c4a6e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                <strong style={{ fontSize: '1rem' }}>Advanced Data Protection Features</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔒</span>
                  <span>End-to-end encryption</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🚫</span>
                  <span>Screenshot prevention</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🚫</span>
                  <span>Copy/paste disabled</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🚫</span>
                  <span>Download blocked</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📊</span>
                  <span>Read-only viewer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⏰</span>
                  <span>Auto session timeout</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🔐</span>
                  <span>Developer tools blocked</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛡️</span>
                  <span>Print prevention</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Request Modal */}
      {showFileRequestModal && (
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Request File</h2>
              <button
                onClick={handleCloseFileRequestModal}
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

            {fileSharingError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {fileSharingError}
              </div>
            )}

            <form onSubmit={handleCreateFileRequest}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Contract *
                </label>
                <select
                  value={fileRequestForm.contract_id}
                  onChange={(e) => handleFileRequestFormChange('contract_id', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select a contract...</option>
                  {contracts.filter(contract => contract.status === 'active').map((contract) => (
                    <option key={contract.contract_id} value={contract.contract_id}>
                      {contract.contract_name} - {contract.target_org_name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Organization *
                </label>
                <select
                  value={fileRequestForm.target_org_id}
                  onChange={(e) => handleFileRequestFormChange('target_org_id', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select target organization...</option>
                  {allOrganizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.org_id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  File Description *
                </label>
                <textarea
                  value={fileRequestForm.file_description}
                  onChange={(e) => handleFileRequestFormChange('file_description', e.target.value)}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Describe the file you need and its purpose..."
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  File Category
                </label>
                <select
                  value={fileRequestForm.file_category}
                  onChange={(e) => handleFileRequestFormChange('file_category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="contract">Contract</option>
                  <option value="compliance">Compliance</option>
                  <option value="financial">Financial</option>
                  <option value="legal">Legal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={fileRequestForm.expires_at}
                  onChange={(e) => handleFileRequestFormChange('expires_at', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseFileRequestModal}
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
                  disabled={fileSharingLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: fileSharingLoading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    cursor: fileSharingLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {fileSharingLoading ? 'Creating Request...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadFileModal && selectedFileRequest && (
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Upload File</h2>
              <button
                onClick={handleCloseUploadFileModal}
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

            <div style={{
              background: '#f0f9ff',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #bae6fd'
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0369a1' }}>
                File Request Details
              </h4>
              <div style={{ fontSize: '0.875rem', color: '#0c4a6e' }}>
                <p><strong>Description:</strong> {selectedFileRequest.file_description}</p>
                <p><strong>Category:</strong> {selectedFileRequest.file_category}</p>
                <p><strong>From:</strong> {selectedFileRequest.requester_org_name}</p>
              </div>
            </div>

            {fileSharingError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {fileSharingError}
              </div>
            )}

            <form onSubmit={handleUploadFile}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select PDF File *
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Only PDF files are allowed. Maximum size: 50MB
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  File Description (Optional)
                </label>
                <textarea
                  id="file-description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Additional description for the uploaded file..."
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseUploadFileModal}
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
                  disabled={fileSharingLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: fileSharingLoading ? '#9ca3af' : '#10b981',
                    color: 'white',
                    cursor: fileSharingLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {fileSharingLoading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Share Modal */}
      {showDirectShareModal && (
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
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Send File</h2>
              <button
                onClick={handleCloseDirectShareModal}
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

            {fileSharingError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {fileSharingError}
              </div>
            )}

            <form onSubmit={handleDirectFileShare}>
              <div style={{ 
                background: '#f0f9ff', 
                border: '1px solid #0ea5e9', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#0369a1'
              }}>
                <strong>💡 File Sharing Info:</strong> You can send files to organizations with active contracts. 
                Organizations without contracts will still be available for direct sharing.
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Target Organization *
                </label>
                <select
                  value={directShareForm.target_org_id}
                  onChange={(e) => handleDirectShareFormChange('target_org_id', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select target organization...</option>
                  {allOrganizations.map((org) => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name} ({org.org_id}){org.contract_count ? ` - ${org.contract_count} active contract${org.contract_count > 1 ? 's' : ''}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  File Description *
                </label>
                <textarea
                  value={directShareForm.file_description}
                  onChange={(e) => handleDirectShareFormChange('file_description', e.target.value)}
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical'
                  }}
                  placeholder="Describe the file you're sharing..."
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  File Category
                </label>
                <select
                  value={directShareForm.file_category}
                  onChange={(e) => handleDirectShareFormChange('file_category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="contract">Contract</option>
                  <option value="compliance">Compliance</option>
                  <option value="financial">Financial</option>
                  <option value="legal">Legal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select PDF File *
                </label>
                <input
                  id="direct-share-file"
                  type="file"
                  accept=".pdf"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Only PDF files are allowed. Maximum size: 50MB
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={directShareForm.expires_at}
                  onChange={(e) => handleDirectShareFormChange('expires_at', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={handleCloseDirectShareModal}
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
                  disabled={fileSharingLoading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: fileSharingLoading ? '#9ca3af' : '#10b981',
                    color: 'white',
                    cursor: fileSharingLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {fileSharingLoading ? 'Sharing...' : 'Share File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfModal && (
        <div className="secure-modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}>
          <div className="secure-modal-content" style={{
            padding: '2rem',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '1200px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <button 
              onClick={handleClosePdfModal} 
              style={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                background: 'none', 
                border: 'none', 
                fontSize: 20, 
                cursor: 'pointer', 
                color: '#6b7280' 
              }}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669' }}>
                🔒 Secure PDF Viewer
              </h2>
            </div>
            
            {pdfLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div>Loading PDF file...</div>
              </div>
            ) : pdfError ? (
              <div style={{ 
                padding: '1rem', 
                background: '#fee2e2', 
                color: '#dc2626', 
                borderRadius: '6px', 
                fontSize: '0.875rem' 
              }}>
                {pdfError}
              </div>
            ) : pdfUrl ? (
              <div style={{ height: '70vh', position: 'relative' }}>
                <div className="security-warning" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>
                    <strong>SECURITY NOTICE:</strong> This is a read-only view. Copying, downloading, or editing is disabled for data protection.
                    <br />
                    <small style={{ opacity: 0.8 }}>Screenshots and screen recording are also prevented for enhanced security.</small>
                  </div>
                </div>
                
                <iframe
                  src={pdfUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    marginTop: '3rem'
                  }}
                  title="PDF Viewer"
                />
              </div>
            ) : null}
            
            <div className="secure-card" style={{ 
              marginTop: '1rem', 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '12px', 
              border: '1px solid #bae6fd',
              fontSize: '0.875rem',
              color: '#0c4a6e'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                <strong>Security Features:</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                <li>Text selection and copying disabled</li>
                <li>Right-click context menu disabled</li>
                <li>Print screen and keyboard shortcuts blocked</li>
                <li>Developer tools access prevented</li>
                <li>All access attempts logged for audit</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Popup Modal */}
      {showAlertsPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <AlertCircle size={24} style={{ color: '#dc2626' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#dc2626' }}>
                Security Alerts Detected
              </h2>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                <strong style={{ color: '#dc2626' }}>⚠️ Security Notice</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>
                {recentAlerts.length} unread security alert{recentAlerts.length > 1 ? 's' : ''} have been detected for your organization. 
                Please review them immediately.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Recent Alerts:</h3>
              <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                {recentAlerts.map((alert, index) => (
                  <div key={index} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    background: 'rgba(220, 38, 38, 0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={14} style={{ 
                        color: alert.severity === 'critical' ? '#dc2626' : 
                               alert.severity === 'high' ? '#ea580c' : 
                               alert.severity === 'medium' ? '#d97706' : '#059669'
                      }} />
                      <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                        {alert.alert_type_display}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: alert.severity === 'critical' ? '#fee2e2' : 
                                   alert.severity === 'high' ? '#fed7aa' : 
                                   alert.severity === 'medium' ? '#fef3c7' : '#d1fae5',
                        color: alert.severity === 'critical' ? '#dc2626' : 
                               alert.severity === 'high' ? '#ea580c' : 
                               alert.severity === 'medium' ? '#d97706' : '#059669'
                      }}>
                        {alert.severity}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                      {alert.description}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                      IP: {alert.ip_address || 'N/A'} | Location: {alert.location?.city}, {alert.location?.country} | 
                      Time: {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseAlertsPopup}
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
                Dismiss
              </button>
              <button
                onClick={handleGoToAlerts}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                View All Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
