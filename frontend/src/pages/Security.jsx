import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Key, Database, Users } from 'lucide-react';

const Security = () => {
  const securityFeatures = [
    {
      icon: <Lock className="w-8 h-8 text-blue-600" />,
      title: "End-to-End Encryption",
      description: "All data is encrypted using AES-256 encryption both in transit and at rest",
      details: [
        "AES-256 encryption for data at rest",
        "TLS 1.3 for data in transit",
        "Encryption keys managed securely",
        "Regular encryption key rotation"
      ]
    },
    {
      icon: <Key className="w-8 h-8 text-blue-600" />,
      title: "Advanced Tokenization",
      description: "Sensitive data is tokenized to prevent exposure while maintaining functionality",
      details: [
        "Aadhaar number tokenization",
        "Bank account number masking",
        "PAN card protection",
        "Real-time data masking"
      ]
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      title: "Multi-Factor Authentication",
      description: "Enhanced security with multiple authentication factors",
      details: [
        "JWT-based authentication",
        "Session management",
        "Secure password policies",
        "Account lockout protection"
      ]
    },
    {
      icon: <Eye className="w-8 h-8 text-blue-600" />,
      title: "Comprehensive Audit Trail",
      description: "Complete visibility into all data access and modifications",
      details: [
        "All access attempts logged",
        "Data modification tracking",
        "User activity monitoring",
        "Compliance reporting"
      ]
    },
    {
      icon: <Database className="w-8 h-8 text-blue-600" />,
      title: "Secure Infrastructure",
      description: "Enterprise-grade infrastructure with multiple security layers",
      details: [
        "Cloud-native architecture",
        "Regular security updates",
        "DDoS protection",
        "24/7 monitoring"
      ]
    },
    {
      icon: <Users className="w-8 h-8 text-blue-600" />,
      title: "Role-Based Access Control",
      description: "Granular permissions based on user roles and responsibilities",
      details: [
        "Organization-level permissions",
        "User role management",
        "Data access controls",
        "Permission inheritance"
      ]
    }
  ];

  const complianceStandards = [
    {
      name: "ISO 27001",
      description: "Information Security Management System",
      status: "Certified"
    },
    {
      name: "SOC 2 Type II",
      description: "Security, Availability, and Confidentiality",
      status: "Compliant"
    },
    {
      name: "GDPR",
      description: "General Data Protection Regulation",
      status: "Compliant"
    },
    {
      name: "RBI Guidelines",
      description: "Reserve Bank of India Security Standards",
      status: "Compliant"
    }
  ];

  const securityPractices = [
    {
      title: "Regular Security Audits",
      description: "We conduct comprehensive security audits every quarter to identify and address potential vulnerabilities."
    },
    {
      title: "Penetration Testing",
      description: "Regular penetration testing by certified security professionals to ensure our defenses remain strong."
    },
    {
      title: "Employee Security Training",
      description: "All employees undergo regular security training to maintain awareness of best practices and threats."
    },
    {
      title: "Incident Response Plan",
      description: "Comprehensive incident response procedures to quickly address and resolve security incidents."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Security & Data Protection
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your data security is our top priority. Learn about the comprehensive security measures 
              and industry-leading practices that protect your information on the PedolOne platform.
            </p>
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Security Features
          </h2>
          <p className="text-xl text-gray-600">
            Multiple layers of security to protect your data
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                {feature.icon}
                <h3 className="text-xl font-semibold text-gray-900 ml-3">
                  {feature.title}
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="flex items-center text-sm text-gray-600">
                    <span className="text-green-500 mr-2">✓</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Standards */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Compliance & Certifications
            </h2>
            <p className="text-xl text-gray-600">
              Meeting the highest industry standards for data protection
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceStandards.map((standard, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">{standard.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{standard.description}</p>
                <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                  {standard.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Practices */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Security Practices
          </h2>
          <p className="text-xl text-gray-600">
            Ongoing commitment to maintaining the highest security standards
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {securityPractices.map((practice, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {practice.title}
              </h3>
              <p className="text-gray-600">
                {practice.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Protection Principles */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Data Protection Principles
            </h2>
            <p className="text-xl text-gray-600">
              Our commitment to protecting your data
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy by Design</h3>
              <p className="text-gray-600">
                Security and privacy are built into every aspect of our platform from the ground up.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Control</h3>
              <p className="text-gray-600">
                You maintain complete control over your data and how it's shared with organizations.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Transparency</h3>
              <p className="text-gray-600">
                Complete visibility into how your data is accessed, used, and protected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Experience Secure Data Sharing?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join organizations that trust PedolOne with their sensitive data
          </p>
          <div className="space-x-4">
            <Link
              to="/signup"
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
            >
              Get Started
            </Link>
            <Link
              to="/contact"
              className="inline-block border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200"
            >
              Contact Security Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security; 