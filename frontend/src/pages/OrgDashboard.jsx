import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  Users, 
  FileText, 
  Shield, 
  Database, 
  Activity,
  Calendar,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download
} from 'lucide-react';

export default function OrgDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeConsents, setActiveConsents] = useState(0);
  const [dataCategories, setDataCategories] = useState([]);
  const [searchUserId, setSearchUserId] = useState('');
  const [searchedUserId, setSearchedUserId] = useState(null);
  const [userPolicies, setUserPolicies] = useState([]);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    // Fetch unique user count for contract_stockbroker_2025
    fetch('http://localhost:8000/policy/contract/contract_stockbroker_2025/unique_users')
      .then(res => res.json())
      .then(data => {
        setTotalUsers(data.unique_user_count || 0);
      })
      .catch(() => setTotalUsers(0));

    // Fetch active consents count for contract_stockbroker_2025
    fetch('http://localhost:8000/policy/contract/contract_stockbroker_2025/active_policies_count')
      .then(res => res.json())
      .then(data => {
        setActiveConsents(data.active_policies_count || 0);
      })
      .catch(() => setActiveConsents(0));

    // Fetch data categories for contract_stockbroker_2025
    fetch('http://localhost:8000/policy/contract/contract_stockbroker_2025/data_categories')
      .then(res => res.json())
      .then(data => {
        setDataCategories(data.data_categories || []);
      })
      .catch(() => setDataCategories([]));
  }, []);

  const handleUserSearch = (e) => {
    e.preventDefault();
    setSearchedUserId(searchUserId);
    setShowUserDetails(false);
    setUserPolicies([]);
  };

  const handleShowDetails = () => {
    if (!searchedUserId) return;
    fetch(`http://localhost:8000/policy/user/${searchedUserId}/active`)
      .then(res => res.json())
      .then(data => {
        setUserPolicies(data || []);
        setShowUserDetails(true);
      })
      .catch(() => {
        setUserPolicies([]);
        setShowUserDetails(true);
      });
  };

  // Mock data for organization dashboard
  const orgData = {
    orgId: user?.organization_id || 'ORG-12345',
    totalUsers: totalUsers,
    activeConsents: activeConsents,
    dataRequests: 23,
    complianceScore: 98.5,
    monthlyActivity: '+12%'
  };

  const recentActivity = [
    {
      id: 1,
      type: 'consent_granted',
      user: 'John Doe',
      action: 'Granted consent for loan application',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'data_request',
      user: 'Jane Smith',
      action: 'Requested salary verification',
      timestamp: '5 minutes ago',
      status: 'pending'
    },
    {
      id: 3,
      type: 'consent_revoked',
      user: 'Mike Johnson',
      action: 'Revoked data sharing consent',
      timestamp: '15 minutes ago',
      status: 'warning'
    },
    {
      id: 4,
      type: 'compliance_check',
      user: 'System',
      action: 'Automated compliance check completed',
      timestamp: '30 minutes ago',
      status: 'success'
    }
  ];

  const complianceMetrics = [
    { metric: 'Data Processing Consent', value: '98.2%', status: 'good' },
    { metric: 'Purpose Limitation', value: '99.1%', status: 'good' },
    { metric: 'Data Minimization', value: '96.7%', status: 'good' },
    { metric: 'Retention Compliance', value: '94.3%', status: 'warning' },
    { metric: 'User Rights Response', value: '100%', status: 'excellent' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'good':
      case 'excellent':
        return '#059669';
      case 'warning':
        return '#d97706';
      case 'pending':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'consent_granted':
        return <CheckCircle size={16} style={{ color: '#059669' }} />;
      case 'data_request':
        return <FileText size={16} style={{ color: '#2563eb' }} />;
      case 'consent_revoked':
        return <AlertTriangle size={16} style={{ color: '#d97706' }} />;
      case 'compliance_check':
        return <Shield size={16} style={{ color: '#059669' }} />;
      default:
        return <Activity size={16} style={{ color: '#6b7280' }} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#111827',
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
                gap: '0.5rem'
              }}>
                <Building2 size={20} />
                Organization ID: <span style={{ fontWeight: '500' }}>{orgData.orgId}</span>
              </p>
            </div>
            <div style={{
              padding: '12px 24px',
              backgroundColor: '#059669',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Compliance Score: {orgData.complianceScore}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            {
              title: 'Total Users',
              value: orgData.totalUsers.toLocaleString(),
              icon: <Users size={24} />,
              color: '#2563eb',
              change: orgData.monthlyActivity
            },
            {
              title: 'Active Consents',
              value: orgData.activeConsents,
              icon: <Shield size={24} />,
              color: '#059669',
              change: '+5 today'
            },
            {
              title: 'Data Requests',
              value: orgData.dataRequests,
              icon: <FileText size={24} />,
              color: '#d97706',
              change: '+12 pending'
            },
            {
              title: 'Data Categories',
              value: dataCategories.length,
              icon: <Database size={24} />,
              color: '#7c3aed',
              change: '5 active'
            }
          ].map((stat, index) => (
            <div key={index} style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div style={{ color: stat.color }}>
                  {stat.icon}
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}>
                  {stat.change}
                </span>
              </div>
              <h3 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0,
                marginBottom: '0.5rem'
              }}>
                {stat.value}
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem',
                margin: 0
              }}>
                {stat.title}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {/* Tab Navigation */}
          <div style={{
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            backgroundColor: '#f9fafb'
          }}>
            {[
              { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
              { id: 'users', label: 'User Management', icon: <Users size={16} /> },
              { id: 'compliance', label: 'Compliance', icon: <Shield size={16} /> },
              { id: 'data', label: 'Data Categories', icon: <Database size={16} /> }
            ].map((tab) => (
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
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Recent Activity
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {recentActivity.map((activity) => (
                    <div key={activity.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {getStatusIcon(activity.type)}
                        <div>
                          <p style={{ margin: 0, fontWeight: '500', color: '#111827' }}>
                            {activity.action}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                            {activity.user} • {activity.timestamp}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: activity.status === 'success' ? '#ecfdf5' : 
                                       activity.status === 'warning' ? '#fef3c7' : '#eff6ff',
                        color: getStatusColor(activity.status)
                      }}>
                        {activity.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Compliance Metrics
                </h3>
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
                          color: getStatusColor(metric.status)
                        }}>
                          {metric.value}
                        </span>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: getStatusColor(metric.status)
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  Data Categories Overview
                </h3>
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
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
                  User Management
                </h3>
                <form onSubmit={handleUserSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter User ID"
                    value={searchUserId}
                    onChange={e => setSearchUserId(e.target.value)}
                    style={{ padding: '0.5rem 1rem', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '1rem' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    Search
                  </button>
                </form>
                {searchedUserId && !showUserDetails && (
                  <button
                    onClick={handleShowDetails}
                    style={{ padding: '0.5rem 1.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', marginBottom: '1rem' }}
                  >
                    Show Details for User ID: {searchedUserId}
                  </button>
                )}
                {showUserDetails && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontWeight: '600', color: '#2563eb', marginBottom: '0.5rem' }}>Policy Details for User ID: {searchedUserId}</h4>
                    {userPolicies.length === 0 ? (
                      <p style={{ color: '#d97706' }}>No active policies found for this user.</p>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead>
                          <tr style={{ background: '#f3f4f6' }}>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Resource</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Purpose</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Shared With</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Contract ID</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Retention</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Created At</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Expiry</th>
                            <th style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>Signature</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userPolicies.map((policy, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{policy.resource_name}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{Array.isArray(policy.purpose) ? policy.purpose.join(', ') : policy.purpose}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{policy.shared_with}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{policy.contract_id}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{policy.retention_window}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{policy.created_at}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb' }}>{policy.expiry}</td>
                              <td style={{ padding: '0.75rem', border: '1px solid #e5e7eb', wordBreak: 'break-all' }}>{policy.signature}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
