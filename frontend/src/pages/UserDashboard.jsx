import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Users, FileText, Eye, AlertCircle } from 'lucide-react';
import MaskedDataCard from '../components/MaskedDataCard';
import ConsentCard from '../components/ConsentCard';
import AuditLogTable from '../components/AuditLogTable';
import axios from 'axios';

const UserDashboard = () => {
  const { user } = useAuth();
  const [maskedData, setMaskedData] = useState([]);
  const [activeConsents, setActiveConsents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addPIIType, setAddPIIType] = useState('aadhaar');
  const [addPIIValue, setAddPIIValue] = useState('');
  const [addPIILoading, setAddPIILoading] = useState(false);
  const [addPIIError, setAddPIIError] = useState(null);
  const [addPIISuccess, setAddPIISuccess] = useState(null);
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
      case 'salary':
        return `₹XX,XXX`;
      default:
        return `XXXX${value.slice(-4)}`;
    }
  };

  const fetchUserData = useCallback(async () => {
    if (!user?.userid) return;
    
    try {
      setError(null);

      // Fetch user's PII data
      const piiResponse = await axios.get(`/auth/user-pii/${user.userid}`);
      const piiArr = Array.isArray(piiResponse.data?.pii) ? piiResponse.data.pii : [];
      const piiData = piiArr.map(item => ({
        label: item.resource.charAt(0).toUpperCase() + item.resource.slice(1),
        maskedValue: maskPII(item.resource, item.original)
      }));
      setMaskedData(piiData);

      // Fetch active policies
      const policiesResponse = await axios.get(`/policy/user/${user.userid}/active`);
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
      const logsResponse = await axios.get(`/policy/user/${user.userid}/logs`);
      const logsArr = Array.isArray(logsResponse.data) ? logsResponse.data : [];
      const logs = logsArr.map(log => ({
        id: log.log_id,
        date: new Date(log.created_at).toLocaleString(),
        fintechName: log.shared_with,
        dataAccessed: log.resource_name.charAt(0).toUpperCase() + log.resource_name.slice(1),
        purpose: Array.isArray(log.purpose) ? log.purpose.join(', ') : log.purpose
      }));
      setAuditLogs(logs);

      setLoading(false);
    } catch (err) {
      setError('Failed to load user data. Please try again later.');
      setLoading(false);
    }
  }, [user]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.userid) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/user/${user.userid}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
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
            id: data.log.log_id,
            date: new Date(data.log.created_at).toLocaleString(),
            fintechName: data.log.shared_with,
            dataAccessed: data.log.resource_name.charAt(0).toUpperCase() + data.log.resource_name.slice(1),
            purpose: Array.isArray(data.log.purpose) ? data.log.purpose.join(', ') : data.log.purpose
          }, ...prev]);
          break;
        
        case 'pii_added':
          fetchUserData(); // Refresh all data when PII is added
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setSocket(ws);

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [user, fetchUserData]);

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
        }
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
        {/* Add PII Form */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Add PII to Your PedolOne Vault</h2>
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
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">PII Value</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full"
                value={addPIIValue}
                onChange={e => setAddPIIValue(e.target.value)}
                placeholder={addPIIType === 'aadhaar' ? 'Enter 12-digit Aadhaar' : 'Enter PAN (ABCDE1234F)'}
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

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your PedolOne Dashboard, {user?.email || 'User'}
          </h1>
          <p className="text-gray-600">
            Manage your data privacy and monitor access across financial platforms
          </p>
        </div>

        {/* Dashboard Sections */}
        <div className="space-y-8">
          {/* Masked Data Viewer Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Shield className="text-blue-600 mr-3" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Masked Data Viewer
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {maskedData.map((data, index) => (
                <MaskedDataCard
                  key={index}
                  label={data.label}
                  maskedValue={data.maskedValue}
                />
              ))}
              {maskedData.length === 0 && (
                <div className="col-span-full text-center text-gray-500">
                  No PII data available
                </div>
              )}
            </div>
          </section>

          {/* Consent Management Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <Users className="text-green-600 mr-3" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Your Active Data Sharing Consents
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeConsents.map((consent, index) => (
                <ConsentCard
                  key={consent.id || index}
                  fintechName={consent.fintechName}
                  dataTypes={consent.dataTypes}
                  purpose={consent.purpose}
                  validTill={consent.validTill}
                  status={consent.status}
                />
              ))}
              {activeConsents.length === 0 && (
                <div className="col-span-full text-center text-gray-500">
                  No active consents
                </div>
              )}
            </div>
          </section>

          {/* Audit Log Preview Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <FileText className="text-purple-600 mr-3" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                Recent Access Logs
              </h2>
            </div>
            {auditLogs.length > 0 ? (
              <>
                <AuditLogTable logs={auditLogs} />
                <div className="mt-4 text-center">
                  <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                    <Eye size={16} className="mr-2" />
                    View All Logs
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">
                No access logs available
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard; 