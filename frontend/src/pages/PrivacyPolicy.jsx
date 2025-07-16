import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  const sections = [
    {
      title: "Information We Collect",
      content: [
        "Personal information (name, email, phone number) provided during registration",
        "Financial data that you choose to store and share through our platform",
        "Usage data and analytics to improve our services",
        "Technical information about your device and browser",
        "Communication data when you contact our support team"
      ]
    },
    {
      title: "How We Use Your Information",
      content: [
        "To provide and maintain our data sharing platform services",
        "To process your requests for data sharing with organizations",
        "To send you important updates about your account and services",
        "To improve our platform and develop new features",
        "To comply with legal obligations and regulatory requirements"
      ]
    },
    {
      title: "Data Sharing and Disclosure",
      content: [
        "We only share your data with organizations you explicitly consent to",
        "Data sharing is controlled by you through our consent management system",
        "We do not sell, rent, or trade your personal information to third parties",
        "We may share data when required by law or to protect our rights",
        "Aggregated, anonymized data may be used for analytics and research"
      ]
    },
    {
      title: "Your Rights and Choices",
      content: [
        "Access and review your personal data stored on our platform",
        "Update or correct your information at any time",
        "Withdraw consent for data sharing with specific organizations",
        "Request deletion of your account and associated data",
        "Opt out of marketing communications while keeping service notifications"
      ]
    },
    {
      title: "Data Security",
      content: [
        "We implement industry-standard security measures to protect your data",
        "All data is encrypted in transit and at rest using AES-256 encryption",
        "Access to your data is strictly controlled and logged",
        "Regular security audits and penetration testing are conducted",
        "We have incident response procedures in place for security events"
      ]
    },
    {
      title: "Data Retention",
      content: [
        "We retain your data as long as your account is active",
        "Data is automatically deleted when you withdraw consent",
        "Account deletion results in complete data removal within 30 days",
        "Some data may be retained longer for legal or regulatory compliance",
        "Audit logs are retained for security and compliance purposes"
      ]
    },
    {
      title: "Cookies and Tracking",
      content: [
        "We use essential cookies to provide core platform functionality",
        "Analytics cookies help us understand how our platform is used",
        "You can control cookie preferences through your browser settings",
        "We do not use tracking cookies for advertising purposes",
        "Third-party services may use cookies for security and analytics"
      ]
    },
    {
      title: "International Data Transfers",
      content: [
        "Your data is primarily stored and processed in India",
        "We ensure adequate protection for any international data transfers",
        "We comply with applicable data protection laws and regulations",
        "Cross-border transfers are conducted under appropriate safeguards",
        "You will be notified of any significant changes to data processing locations"
      ]
    },
    {
      title: "Children's Privacy",
      content: [
        "Our platform is not intended for children under 18 years of age",
        "We do not knowingly collect personal information from children",
        "If we become aware of collecting data from children, we will delete it",
        "Parents or guardians should contact us if they believe we have collected children's data",
        "We encourage parents to monitor their children's online activities"
      ]
    },
    {
      title: "Changes to This Policy",
      content: [
        "We may update this privacy policy from time to time",
        "Significant changes will be communicated via email or platform notification",
        "Continued use of our platform after changes constitutes acceptance",
        "You can review the current policy at any time on our website",
        "Previous versions of the policy are available upon request"
      ]
    }
  ];

  const contactInfo = {
    email: "privacy@pedolone.com",
    address: "PedolOne Privacy Team\nMumbai, Maharashtra, India",
    phone: "+91-XXXXXXXXXX"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p className="text-lg text-gray-600 mt-2">
              How we collect, use, and protect your personal information
            </p>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Introduction
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            At PedolOne, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            secure data sharing platform.
          </p>
          <p className="text-gray-700 leading-relaxed">
            By using our platform, you agree to the collection and use of information in accordance with this policy. 
            We are committed to transparency and will always inform you about how your data is being used.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.content.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-blue-500 mr-3 mt-1">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Contact Us
          </h2>
          <p className="text-gray-700 mb-6">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">{contactInfo.email}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600 whitespace-pre-line">{contactInfo.address}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">{contactInfo.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Subject Rights */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Data Subject Rights
          </h2>
          <p className="text-gray-700 mb-6">
            Under applicable data protection laws, you have the following rights regarding your personal data:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Access</h3>
                <p className="text-sm text-gray-600">
                  Request a copy of your personal data and information about how it's processed.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Rectification</h3>
                <p className="text-sm text-gray-600">
                  Request correction of inaccurate or incomplete personal data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Erasure</h3>
                <p className="text-sm text-gray-600">
                  Request deletion of your personal data under certain circumstances.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Portability</h3>
                <p className="text-sm text-gray-600">
                  Request transfer of your data to another service provider.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Object</h3>
                <p className="text-sm text-gray-600">
                  Object to processing of your data for specific purposes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Withdraw Consent</h3>
                <p className="text-sm text-gray-600">
                  Withdraw consent for data processing at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Questions About Privacy?
          </h2>
          <p className="text-blue-100 mb-6">
            Our privacy team is here to help you understand your rights and our data practices.
          </p>
          <div className="space-x-4">
            <Link
              to="/contact"
              className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
            >
              Contact Privacy Team
            </Link>
            <Link
              to="/security"
              className="inline-block border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200"
            >
              Learn About Security
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 