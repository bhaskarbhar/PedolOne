import React from 'react';
import { Shield, Users, FileText, Eye } from 'lucide-react';
import MaskedDataCard from '../components/MaskedDataCard';
import ConsentCard from '../components/ConsentCard';
import AuditLogTable from '../components/AuditLogTable';

const UserDashboard = () => {
  // Mock data for demonstration
  const maskedData = [
    { label: 'Aadhaar Number', maskedValue: 'XXXX-XXXX-1234' },
    { label: 'PAN', maskedValue: 'XXXXX1234X' },
    { label: 'Bank Account', maskedValue: 'XXXXXX7890' },
    { label: 'Salary', maskedValue: '₹X0,000' },
  ];

  const activeConsents = [
    {
      fintechName: 'LendingApp Inc',
      dataTypes: 'PAN + Salary',
      purpose: 'Loan Processing',
      validTill: '15/03/2025',
      status: 'active'
    },
    {
      fintechName: 'NeoBank',
      dataTypes: 'Aadhaar',
      purpose: 'KYC Verification',
      validTill: '22/02/2025',
      status: 'active'
    },
    {
      fintechName: 'FinTech Solutions',
      dataTypes: 'Bank Account + Salary',
      purpose: 'Credit Assessment',
      validTill: '10/04/2025',
      status: 'active'
    }
  ];

  const auditLogs = [
    {
      date: '15/01/2025 14:30',
      fintechName: 'LendingApp Inc',
      dataAccessed: 'PAN, Salary',
      purpose: 'Loan eligibility check'
    },
    {
      date: '14/01/2025 09:15',
      fintechName: 'NeoBank',
      dataAccessed: 'Aadhaar',
      purpose: 'Account verification'
    },
    {
      date: '13/01/2025 16:45',
      fintechName: 'FinTech Solutions',
      dataAccessed: 'Bank Account',
      purpose: 'Credit score calculation'
    },
    {
      date: '12/01/2025 11:20',
      fintechName: 'LendingApp Inc',
      dataAccessed: 'Salary',
      purpose: 'Income verification'
    },
    {
      date: '11/01/2025 13:55',
      fintechName: 'PayTech Corp',
      dataAccessed: 'PAN',
      purpose: 'Tax compliance check'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Secure Vault, Aryan
          </h1>
          <p className="text-gray-600">
            Manage your data privacy and monitor access across financial platforms
          </p>
        </div>

        {/* Dashboard Sections */}
        <div className="space-y-8">
          {/* 1. Masked Data Viewer Section */}
          <section>
            <div className="flex items-center mb-6">
              <Shield className="text-blue-600 mr-3" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                🔐 Masked Data Viewer
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
            </div>
          </section>

          {/* 2. Consent Management Section */}
          <section>
            <div className="flex items-center mb-6">
              <Users className="text-green-600 mr-3" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                🧾 Your Active Data Sharing Consents
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeConsents.map((consent, index) => (
                <ConsentCard
                  key={index}
                  fintechName={consent.fintechName}
                  dataTypes={consent.dataTypes}
                  purpose={consent.purpose}
                  validTill={consent.validTill}
                  status={consent.status}
                />
              ))}
            </div>
          </section>

          {/* 3. Audit Log Preview Section */}
          <section>
            <div className="flex items-center mb-6">
              <FileText className="text-purple-600 mr-3" size={24} />
              <h2 className="text-2xl font-semibold text-gray-800">
                📜 Recent Access Logs
              </h2>
            </div>
            <AuditLogTable logs={auditLogs} />
            <div className="mt-4 text-center">
              <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <Eye size={16} className="mr-2" />
                View All Logs
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard; 