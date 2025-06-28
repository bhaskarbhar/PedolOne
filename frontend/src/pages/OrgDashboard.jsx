import React, { useState } from 'react';
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

  // Mock data for organization dashboard
  const orgData = {
    orgId: user?.organization_id || 'ORG-12345',
    totalUsers: 1247,
    activeConsents: 89,
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

  const dataCategories = [
    { name: 'Personal Information', count: 1247, percentage: 100 },
    { name: 'Financial Data', count: 892, percentage: 71.5 },
    { name: 'Employment Details', count: 1156, percentage: 92.7 },
    { name: 'Credit Information', count: 734, percentage: 58.8 },
    { name: 'Transaction History', count: 567, percentage: 45.5 }
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
                          {category.count} users ({category.percentage}%)
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
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>User management features coming soon...</p>
                  <p style={{ fontSize: '0.875rem' }}>
                    This section will include user consent management, data access controls, and user activity monitoring.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
