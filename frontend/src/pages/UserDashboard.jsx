import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Shield, Users, FileText, Eye, AlertCircle, 
  Send, CheckCircle, XCircle,
  UserCheck
} from 'lucide-react';
import MaskedDataCard from '../components/MaskedDataCard';
import ConsentCard from '../components/ConsentCard';
import AuditLogTable from '../components/AuditLogTable';
import axios from 'axios';

const UserDashboard = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [maskedData, setMaskedData] = useState([]);
  const [activeConsents, setActiveConsents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dataRequests, setDataRequests] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // PII Management
  const [addPIIType, setAddPIIType] = useState('aadhaar');
  const [addPIIValue, setAddPIIValue] = useState('');
  const [addPIILoading, setAddPIILoading] = useState(false);
  const [addPIIError, setAddPIIError] = useState(null);
  const [addPIISuccess, setAddPIISuccess] = useState(null);
  
  // Data Request Management
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);
  const [sendRequestData, setSendRequestData] = useState({
    target_user_email: '',
    requested_resources: [],
    purpose: [],
    retention_window: '30 days',
    request_message: ''
  });
  
  // User Management
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  
  const [socket, setSocket] = useState(null);
  // Helper function to mask PII data
  const maskPII = (type, value) => {
    if (!value) return 'XXXX';
    
    switch (type.toLowerCase()) {
      case 'aadhaar':
        return `XXXX-XXXX-${value.slice(-4)}`;
      case 'pan':
        return `${value.slice(0, 2)}XXX${value.slice(5, 9)}${value.slice(-1)}`;
      case 'account':
        return `XXXXXX${value.slice(-4)}`;
      case 'passport':
        return `${value.slice(0, 1)}XXXXXXX`;
      case 'drivinglicense':
        return `${value.slice(0, 2)}XXXXXXXXXXXXX`;
      case 'ifsc':
        return `${value.slice(0, 4)}0XXXXXX`;
      case 'creditcard':
      case 'debitcard':
        return `XXXX-XXXX-XXXX-${value.slice(-4)}`;
      case 'gst':
        return `${value.slice(0, 2)}XXXXX${value.slice(7, 11)}XZ${value.slice(-1)}`;
      case 'upi':
        return `${value.split('@')[0]}@XXXX`;
      default:
        return `XXXX${value.slice(-4)}`;
    }
  };

  // Helper function to get placeholder text for PII input
  const getPlaceholderText = (type) => {
    switch (type) {
      case 'aadhaar':
        return 'Enter 12-digit Aadhaar';
      case 'pan':
        return 'Enter PAN (ABCDE1234F)';
      case 'account':
        return 'Enter Account Number (9-18 digits)';
      case 'passport':
        return 'Enter Passport (A1234567)';
      case 'drivinglicense':
        return 'Enter Driving License (DL0123456789012)';
      case 'ifsc':
        return 'Enter IFSC Code (SBIN0001234)';
      case 'creditcard':
        return 'Enter Credit Card Number (16 digits)';
      case 'debitcard':
        return 'Enter Debit Card Number (16 digits)';
      case 'gst':
        return 'Enter GST Number (22AABCU9603R1Z5)';
      case 'itform16':
        return 'Enter IT Form 16 details';
      case 'upi':
        return 'Enter UPI ID (user@bank)';
      default:
        return 'Enter value';
    }
  };

  //backend
  const isLocalhost = window.location.hostname === 'localhost';
  const BACKEND_URL = isLocalhost ? '' : 'https://pedolone.onrender.com';
  // Helper function to get axios config with Authorization header
  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchUserData = useCallback(async () => {
    if (!user?.userid) return;
    
    try {
      setError(null);

      // Fetch user's PII data
      const piiResponse = await axios.get(`${BACKEND_URL}/auth/user-pii/${user.userid}`, getAuthConfig());
      const piiArr = Array.isArray(piiResponse.data?.pii) ? piiResponse.data.pii : [];
      const piiData = piiArr.map(item => ({
        label: item.resource.charAt(0).toUpperCase() + item.resource.slice(1),
        maskedValue: maskPII(item.resource, item.original)
      }));
      setMaskedData(piiData);

      // Fetch active policies
      const policiesResponse = await axios.get(`${BACKEND_URL}/policy/user/${user.userid}/active`, getAuthConfig());
      const policiesArr = Array.isArray(policiesResponse.data) ? policiesResponse.data : [];
      const consents = policiesArr.map(policy => ({
        id: policy.policy_id,
        fintechName: policy.shared_with,
        dataTypes: policy.resource_name.charAt(0).toUpperCase() + policy.resource_name.slice(1),
        purpose: Array.isArray(policy.purpose) ? policy.purpose.join(', ') : policy.purpose,
        validTill: new Date(policy.expiry).toLocaleDateString(),
        status: new Date(policy.expiry) > new Date() ? 'active' : 'expired'
      }));
      setActiveConsents(consents);

      // Fetch access logs
      const logsResponse = await axios.get(`${BACKEND_URL}/policy/user/${user.userid}/logs`, getAuthConfig());
      const logsArr = Array.isArray(logsResponse.data) ? logsResponse.data : [];
      let filteredLogs = logsArr;
      if (user?.user_type === 'organization' && user.organization_id) {
        filteredLogs = logsArr.filter(log => log.fintech_id === user.organization_id);
      }
      const logs = filteredLogs.map(log => ({
        id: log._id || log.log_id,
        date: new Date(log.created_at).toLocaleString(),
        type: log.log_type || 'consent',
        dataSource: log.data_source || 'individual',
        fintechName: log.fintech_name || log.shared_with || 'Unknown',
        dataAccessed: log.resource_name.charAt(0).toUpperCase() + log.resource_name.slice(1),
        purpose: Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose,
        ipAddress: log.ip_address || 'N/A'
      }));
      setAuditLogs(logs);

      // Fetch data requests (if user is individual)
      if (user.user_type === 'individual') {
        const requestsResponse = await axios.get(`${BACKEND_URL}/data-requests/received/${user.userid}`, getAuthConfig());
        setDataRequests(requestsResponse.data || []);
      }

      // Fetch organization users (if user is organization admin)
      if (user.user_type === 'organization') {
        const orgUsersResponse = await axios.get(`${BACKEND_URL}/organization/${user.organization_id}/clients`, getAuthConfig());
        setOrgUsers(orgUsersResponse.data || []);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load user data. Please try again later.');
      setLoading(false);
    }
  }, [user, token]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.userid || !token) return;
    const BACKEND_URL = "https://pedolone.onrender.com" || "http://localhost:8000";
    const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${BACKEND_URL.replace(/^https?:\/\//, '')}/ws/user/${user.userid}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Handle different types of updates
      switch (data.type) {
        case 'policy_created':
          setActiveConsents(prev => [...prev, {
            id: data.policy.policy_id,
            fintechName: data.policy.shared_with,
            dataTypes: data.policy.resource_name.charAt(0).toUpperCase() + data.policy.resource_name.slice(1),
            purpose: Array.isArray(data.policy.purpose) ? data.policy.purpose.join(', ') : data.policy.purpose,
            validTill: new Date(data.policy.expiry).toLocaleDateString(),
            status: 'active'
          }]);
          break;
        
        case 'policy_expired':
          setActiveConsents(prev => prev.map(consent => 
            consent.id === data.policy_id 
              ? { ...consent, status: 'expired' }
              : consent
          ));
          break;
        
        case 'access_log':
          setAuditLogs(prev => [{
            id: data.log._id || data.log.log_id,
            date: new Date(data.log.created_at).toLocaleString(),
            type: data.log.log_type || 'consent',
            dataSource: data.log.data_source || 'individual',
            fintechName: data.log.fintech_name || data.log.shared_with || 'Unknown',
            dataAccessed: data.log.resource_name.charAt(0).toUpperCase() + data.log.resource_name.slice(1),
            purpose: Array.isArray(data.log.purpose) ? data.log.purpose.join(', ') : data.log.purpose,
            ipAddress: data.log.ip_address || 'N/A'
          }, ...prev]);
          break;
        
        case 'pii_added':
          fetchUserData(); // Refresh all data when PII is added
          break;

        case 'data_request_received':
          setDataRequests(prev => [data.request, ...prev]);
          break;

        case 'data_request_responded':
          setDataRequests(prev => prev.map(req => 
            req.request_id === data.request_id 
              ? { ...req, status: data.status, response_message: data.response_message }
              : req
          ));
          break;
      }
    };

    ws.onerror = (error) => {
    };

    ws.onclose = () => {
    };

    setSocket(ws);

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [user, token, fetchUserData]);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleAddPII = async (e) => {
    e.preventDefault();
    setAddPIILoading(true);
    setAddPIIError(null);
    setAddPIISuccess(null);
    try {
      const res = await axios.post('/auth/user-pii/add', null, {
        params: {
          user_id: user.userid,
          resource: addPIIType,
          pii_value: addPIIValue
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.status === 'success') {
        setAddPIISuccess('PII added successfully!');
        setAddPIIValue('');
        fetchUserData();
      } else {
        setAddPIIError(res.data?.error || 'Failed to add PII.');
      }
    } catch (err) {
      setAddPIIError(err.response?.data?.detail || 'Failed to add PII.');
    } finally {
      setAddPIILoading(false);
    }
  };

  const handleSendDataRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/data-requests/send-request', sendRequestData, getAuthConfig());
      setShowSendRequestModal(false);
      setSendRequestData({
        target_user_email: '',
        requested_resources: [],
        purpose: [],
        retention_window: '30 days',
        request_message: ''
      });
      // Refresh data requests
      if (user.user_type === 'organization') {
        const requestsResponse = await axios.get(`${BACKEND_URL}/data-requests/sent/${user.organization_id}`, getAuthConfig());
        setDataRequests(requestsResponse.data || []);
      }
    } catch (err) {
    }
  };

  const handleRespondToRequest = async (requestId, status, message = '') => {
    try {
      await axios.post('/data-requests/respond', {
        request_id: requestId,
        status: status,
        response_message: message
      }, getAuthConfig());
      fetchUserData(); // Refresh data
    } catch (err) {
    }
  };

  const handleUserClick = async (userId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/organization/${user.organization_id}/clients/${userId}/pii`, getAuthConfig());
      setSelectedUser({
        user_id: userId,
        ...response.data
      });
      setShowUserDetailModal(true);
    } catch (err) {
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-blue-600 flex items-center">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading your dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-gray-600 mt-2">
            {user?.user_type === 'organization' ? 'Organization Dashboard' : 'Personal Data Vault'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Shield },
              { id: 'pii', label: 'PII Management', icon: FileText },
              { id: 'consents', label: 'Active Consents', icon: UserCheck },
              { id: 'requests', label: 'Data Requests', icon: Send },
              { id: 'logs', label: 'Audit Logs', icon: Eye },
              ...(user?.user_type === 'organization' ? [{ id: 'users', label: 'User Management', icon: Users }] : [])
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">PII Records</p>
                      <p className="text-2xl font-bold text-blue-900">{maskedData.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Active Consents</p>
                      <p className="text-2xl font-bold text-green-900">{activeConsents.filter(c => c.status === 'active').length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Send className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Pending Requests</p>
                      <p className="text-2xl font-bold text-purple-900">{dataRequests.filter(r => r.status === 'pending').length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Eye className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Data Accesses</p>
                      <p className="text-2xl font-bold text-orange-900">{auditLogs.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PII Management Tab */}
          {activeTab === 'pii' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">PII Management</h2>
              
        {/* Add PII Form */}
              <div className="mb-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Add PII to Your PedolOne Vault</h3>
          <form className="flex flex-col md:flex-row md:items-end gap-4" onSubmit={handleAddPII}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PII Type</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={addPIIType}
                onChange={e => setAddPIIType(e.target.value)}
              >
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN</option>
                      <option value="account">Account Number</option>
                      <option value="passport">Passport</option>
                      <option value="drivinglicense">Driving License</option>
                      <option value="ifsc">IFSC Code</option>
                      <option value="creditcard">Credit Card</option>
                      <option value="debitcard">Debit Card</option>
                      <option value="gst">GST Number</option>
                      <option value="itform16">IT Form 16</option>
                      <option value="upi">UPI ID</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">PII Value</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={addPIIValue}
                onChange={e => setAddPIIValue(e.target.value)}
                      placeholder={getPlaceholderText(addPIIType)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={addPIILoading}
            >
              {addPIILoading ? 'Adding...' : 'Add PII'}
            </button>
          </form>
          {addPIIError && <div className="text-red-600 mt-2">{addPIIError}</div>}
          {addPIISuccess && <div className="text-green-600 mt-2">{addPIISuccess}</div>}
        </div>

              {/* PII Data Display */}
              <div>
                <h3 className="text-lg font-medium mb-4">Your PII Records</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {maskedData.map((item, index) => (
                <MaskedDataCard
                  key={index}
                      label={item.label}
                      maskedValue={item.maskedValue}
                />
              ))}
                </div>
            </div>
            </div>
          )}

          {/* Active Consents Tab */}
          {activeTab === 'consents' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Active Consents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeConsents.map((consent, index) => (
                <ConsentCard
                    key={index}
                    id={consent.id}
                  fintechName={consent.fintechName}
                  dataTypes={consent.dataTypes}
                  purpose={consent.purpose}
                  validTill={consent.validTill}
                  status={consent.status}
                />
              ))}
              </div>
            </div>
          )}

          {/* Data Requests Tab */}
          {activeTab === 'requests' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Data Requests</h2>
                {user?.user_type === 'organization' && (
                  <button
                    onClick={() => setShowSendRequestModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Send size={16} className="mr-2" />
                    Send Request
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {dataRequests.map((request, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          {user?.user_type === 'individual' 
                            ? `Request from ${request.requester_org_name}`
                            : `Request to ${request.target_user_email}`
                          }
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Requested: {request.requested_resources.join(', ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          Purpose: {request.purpose.join(', ')}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires: {new Date(request.expires_at).toLocaleDateString()}
                        </p>
                        {request.request_message && (
                          <p className="text-sm text-gray-600 mt-2">
                            Message: {request.request_message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                        {user?.user_type === 'individual' && request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRespondToRequest(request.request_id, 'approved')}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={() => handleRespondToRequest(request.request_id, 'rejected')}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {dataRequests.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No data requests found.
                  </div>
                )}
              </div>
                </div>
              )}

          {/* Audit Logs Tab */}
          {activeTab === 'logs' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
              <AuditLogTable logs={auditLogs} />
            </div>
          )}

          {/* User Management Tab (Organization Only) */}
          {activeTab === 'users' && user?.user_type === 'organization' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">User Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orgUsers.map((orgUser, index) => (
                  <div
                    key={index}
                    onClick={() => handleUserClick(orgUser.userid)}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{orgUser.full_name}</h3>
                        <p className="text-sm text-gray-600">{orgUser.email}</p>
                        <p className="text-xs text-gray-500">
                          {orgUser.shared_resources?.length || 0} PII types shared
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Send Request Modal */}
        {showSendRequestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Send Data Access Request</h3>
              <form onSubmit={handleSendDataRequest}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Email</label>
                    <input
                      type="email"
                      value={sendRequestData.target_user_email}
                      onChange={(e) => setSendRequestData({...sendRequestData, target_user_email: e.target.value})}
                      className="border rounded px-3 py-2 w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requested PII Types</label>
                    <select
                      multiple
                      value={sendRequestData.requested_resources}
                      onChange={(e) => setSendRequestData({
                        ...sendRequestData, 
                        requested_resources: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="border rounded px-3 py-2 w-full"
                      required
                    >
                      <option value="aadhaar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="account">Account Number</option>
                      <option value="passport">Passport</option>
                      <option value="drivinglicense">Driving License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <input
                      type="text"
                      value={sendRequestData.purpose.join(', ')}
                      onChange={(e) => setSendRequestData({
                        ...sendRequestData, 
                        purpose: e.target.value.split(',').map(p => p.trim())
                      })}
                      className="border rounded px-3 py-2 w-full"
                      placeholder="KYC, Verification"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message (Optional)</label>
                    <textarea
                      value={sendRequestData.request_message}
                      onChange={(e) => setSendRequestData({...sendRequestData, request_message: e.target.value})}
                      className="border rounded px-3 py-2 w-full"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowSendRequestModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Send Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {showUserDetailModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">User Details</h3>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">User Information</h4>
                  <p>Email: {selectedUser.email}</p>
                  <p>Phone: {selectedUser.phone_number}</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Shared PII Data</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.pii?.map((pii, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">{pii.resource}:</span> {pii.token}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium">Active Policies</h4>
                  <div className="space-y-2">
                    {selectedUser.policies?.map((policy, index) => (
                      <div key={index} className="bg-blue-50 p-3 rounded">
                        <p><strong>Resource:</strong> {policy.resource_name}</p>
                        <p><strong>Purpose:</strong> {policy.purpose?.join(', ')}</p>
                        <p><strong>Expires:</strong> {new Date(policy.expiry).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
              </div>
            )}
      </div>
    </div>
  );
};

export default UserDashboard; 