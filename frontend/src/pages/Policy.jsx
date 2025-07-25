import React from 'react';
import { Link } from 'react-router-dom';

const Policy = () => {
  const policies = [
    {
      title: "Data Sharing Policy",
      description: "Guidelines for secure and compliant data sharing between organizations",
      content: [
        "All data sharing must be explicitly consented to by the data owner",
        "Organizations can only access data for specified purposes",
        "Data access is logged and auditable",
        "Data is encrypted in transit and at rest",
        "Organizations must comply with data protection regulations"
      ]
    },
    {
      title: "Consent Management",
      description: "How user consent is collected, managed, and enforced",
      content: [
        "Users must provide explicit consent for each data sharing request",
        "Consent can be withdrawn at any time",
        "Consent history is maintained for audit purposes",
        "Users are notified of all data access",
        "Granular consent options for different data types"
      ]
    },
    {
      title: "Organization Responsibilities",
      description: "Responsibilities and obligations for organizations using the platform",
      content: [
        "Maintain secure access to the platform",
        "Use data only for authorized purposes",
        "Implement appropriate security measures",
        "Report any security incidents immediately",
        "Comply with all applicable regulations"
      ]
    },
    {
      title: "Data Retention",
      description: "How long data is retained and when it is deleted",
      content: [
        "Data is retained as long as consent is active",
        "Data is automatically deleted when consent is withdrawn",
        "Audit logs are retained for compliance purposes",
        "Organizations must delete data when no longer needed",
        "Data deletion is logged and verified"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Data Sharing Policies
            </h1>
            <p className="text-xl text-gray-600">
              Comprehensive guidelines for secure and compliant data sharing on the PedolOne platform
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {policies.map((policy, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {policy.title}
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                {policy.description}
              </p>
              <ul className="space-y-3">
                {policy.content.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance Section */}
        <div className="bg-blue-50 rounded-xl p-8 mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Regulatory Compliance
          </h2>
          <p className="text-gray-700 mb-6">
            PedolOne is designed to help organizations comply with various data protection regulations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">GDPR Compliance</h3>
              <p className="text-sm text-gray-600">
                Full compliance with EU General Data Protection Regulation requirements
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">RBI Guidelines</h3>
              <p className="text-sm text-gray-600">
                Adherence to Reserve Bank of India data sharing guidelines
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">IRDAI Regulations</h3>
              <p className="text-sm text-gray-600">
                Compliance with Insurance Regulatory and Development Authority guidelines
              </p>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">SEBI Requirements</h3>
              <p className="text-sm text-gray-600">
                Meeting Securities and Exchange Board of India data protection standards
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Questions About Our Policies?
          </h2>
          <p className="text-gray-600 mb-6">
            If you have any questions about our data sharing policies or need clarification on any guidelines, 
            please don't hesitate to reach out to our compliance team.
          </p>
          <div className="space-x-4">
            <Link
              to="/contact"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Contact Us
            </Link>
            <Link
              to="/about"
              className="inline-block border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policy; 