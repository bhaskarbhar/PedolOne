import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  const sections = [
    {
      title: "Acceptance of Terms",
      content: [
        "By accessing and using PedolOne, you accept and agree to be bound by the terms and provision of this agreement.",
        "If you do not agree to abide by the above, please do not use this service.",
        "These terms apply to all users of the platform, including organizations and individuals."
      ]
    },
    {
      title: "Description of Service",
      content: [
        "PedolOne is a secure data sharing platform designed for financial institutions and individuals.",
        "The service enables secure storage, tokenization, and controlled sharing of personal and financial data.",
        "We provide APIs, web interfaces, and tools for data management and consent control."
      ]
    },
    {
      title: "User Accounts and Registration",
      content: [
        "You must register for an account to use certain features of the service.",
        "You are responsible for maintaining the confidentiality of your account credentials.",
        "You must provide accurate and complete information during registration.",
        "You are responsible for all activities that occur under your account."
      ]
    },
    {
      title: "Data and Privacy",
      content: [
        "We process personal data in accordance with our Privacy Policy.",
        "You retain ownership of your data and control how it is shared.",
        "We implement appropriate security measures to protect your data.",
        "Data sharing requires explicit consent from the data owner."
      ]
    },
    {
      title: "Acceptable Use",
      content: [
        "You agree not to use the service for any unlawful purpose.",
        "You must not attempt to gain unauthorized access to the service or other users' data.",
        "You must not interfere with or disrupt the service or servers.",
        "You must comply with all applicable laws and regulations."
      ]
    },
    {
      title: "Intellectual Property",
      content: [
        "The service and its original content are owned by PedolOne and are protected by copyright laws.",
        "You retain ownership of your data and content.",
        "You grant us a license to process and store your data as necessary to provide the service.",
        "You may not copy, modify, or distribute our proprietary content without permission."
      ]
    },
    {
      title: "Limitation of Liability",
      content: [
        "PedolOne is provided 'as is' without warranties of any kind.",
        "We are not liable for any indirect, incidental, or consequential damages.",
        "Our liability is limited to the amount paid for the service in the 12 months preceding the claim.",
        "We are not responsible for data loss due to user error or third-party actions."
      ]
    },
    {
      title: "Termination",
      content: [
        "You may terminate your account at any time by contacting us.",
        "We may terminate or suspend your account for violation of these terms.",
        "Upon termination, your data will be deleted in accordance with our data retention policy.",
        "Some provisions of these terms survive termination."
      ]
    },
    {
      title: "Changes to Terms",
      content: [
        "We may modify these terms at any time by posting updated terms on the platform.",
        "Continued use of the service after changes constitutes acceptance of the new terms.",
        "We will notify users of significant changes via email or platform notification.",
        "You should review these terms periodically for updates."
      ]
    },
    {
      title: "Governing Law",
      content: [
        "These terms are governed by the laws of India.",
        "Any disputes will be resolved in the courts of Mumbai, India.",
        "If any provision is found to be unenforceable, the remaining provisions remain in effect.",
        "These terms constitute the entire agreement between you and PedolOne."
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
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p className="text-lg text-gray-600 mt-2">
              Please read these terms carefully before using the PedolOne platform
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {sections.map((section, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.content.map((item, idx) => (
                  <p key={idx} className="text-gray-700 leading-relaxed">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 rounded-xl p-8 mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Contact Information
          </h2>
          <p className="text-gray-700 mb-6">
            If you have any questions about these Terms of Service, please contact us:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">legal@pedolone.com</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600">
                PedolOne Legal Department<br />
                Mumbai, Maharashtra, India
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Agreement to Terms
          </h2>
          <p className="text-gray-600 mb-6">
            By using the PedolOne platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
          <div className="space-x-4">
            <Link
              to="/contact"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Contact Legal Team
            </Link>
            <Link
              to="/policy"
              className="inline-block border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
            >
              View Policies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 