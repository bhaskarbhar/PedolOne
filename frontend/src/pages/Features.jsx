import React from 'react';
import { Link } from 'react-router-dom';

const Features = () => {
  const features = [
    {
      title: "Multi-Organization Support",
      description: "Seamlessly manage data sharing between banks, insurance companies, and stockbrokers with role-based access control.",
      icon: "🏢",
      details: [
        "Cross-organization data sharing",
        "Role-based permissions",
        "Organization-specific dashboards",
        "Secure inter-organization contracts"
      ]
    },
    {
      title: "Advanced PII Tokenization",
      description: "Protect sensitive personal information with state-of-the-art tokenization and encryption techniques.",
      icon: "🔐",
      details: [
        "Aadhaar number tokenization",
        "Bank account encryption",
        "PAN card protection",
        "Real-time data masking"
      ]
    },
    {
      title: "Comprehensive Audit Trail",
      description: "Track every data access and modification with detailed audit logs for compliance and security.",
      icon: "📋",
      details: [
        "Complete access history",
        "Data modification tracking",
        "User activity monitoring",
        "Compliance reporting"
      ]
    },
    {
      title: "Smart Consent Management",
      description: "Empower users with granular control over their data sharing preferences and consent.",
      icon: "✅",
      details: [
        "Granular consent options",
        "Consent withdrawal",
        "Consent history tracking",
        "Automated consent reminders"
      ]
    },
    {
      title: "Real-time Notifications",
      description: "Stay informed with instant notifications about data access and important events.",
      icon: "🔔",
      details: [
        "Data access alerts",
        "Consent updates",
        "Security notifications",
        "Email and in-app notifications"
      ]
    },
    {
      title: "Secure API Integration",
      description: "Robust API endpoints for seamless integration with existing systems and applications.",
      icon: "🔌",
      details: [
        "RESTful API design",
        "JWT authentication",
        "Rate limiting",
        "Comprehensive documentation"
      ]
    }
  ];

  const useCases = [
    {
      title: "Banking Sector",
      description: "Secure sharing of customer financial data with insurance and investment partners.",
      icon: "🏦",
      benefits: ["KYC verification", "Loan processing", "Investment advisory", "Risk assessment"]
    },
    {
      title: "Insurance Industry",
      description: "Access to verified customer data for policy underwriting and claims processing.",
      icon: "🛡️",
      benefits: ["Policy underwriting", "Claims verification", "Risk assessment", "Customer profiling"]
    },
    {
      title: "Stockbroking",
      description: "Enhanced customer onboarding and compliance with regulatory requirements.",
      icon: "📈",
      benefits: ["Account opening", "Compliance checks", "Risk profiling", "Investment recommendations"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Platform Features
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover the comprehensive suite of features that make PedolOne the leading 
              platform for secure, compliant, and efficient data sharing between organizations.
            </p>
          </div>
        </div>
      </div>

      {/* Main Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
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

      {/* Use Cases Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Industry Use Cases
            </h2>
            <p className="text-xl text-gray-600">
              See how different industries leverage PedolOne for their specific needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {useCase.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {useCase.description}
                </p>
                <div className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center text-sm text-gray-700">
                      <span className="text-blue-500 mr-2">•</span>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Built with Modern Technology
          </h2>
          <p className="text-xl text-gray-600">
            Leveraging cutting-edge technologies for security, performance, and scalability
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { name: "React", description: "Frontend Framework" },
            { name: "FastAPI", description: "Backend API" },
            { name: "PostgreSQL", description: "Database" },
            { name: "JWT", description: "Authentication" },
            { name: "WebSocket", description: "Real-time Communication" },
            { name: "Tailwind CSS", description: "Styling" },
            { name: "Python", description: "Backend Language" },
            { name: "Vite", description: "Build Tool" }
          ].map((tech, index) => (
            <div key={index} className="text-center">
              <div className="bg-white rounded-lg p-4 shadow-md">
                <h3 className="font-semibold text-gray-900">{tech.name}</h3>
                <p className="text-sm text-gray-600">{tech.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join organizations already using PedolOne for secure data sharing
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
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features; 