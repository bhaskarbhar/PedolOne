import React from 'react';
import { Shield, Users, Target, Award, Globe, Zap } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About PedolOne
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
            Revolutionizing how sensitive financial data is stored, shared, and protected in the modern fintech ecosystem.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-center mb-6">
                <Target className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                To democratize secure data sharing in the financial sector by providing enterprise-grade 
                privacy-first solutions that put users in control of their personal information while 
                enabling seamless, compliant data flows between organizations.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-center mb-6">
                <Globe className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Our Vision</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed">
                To become the global standard for privacy-preserving data sharing, creating a world 
                where individuals and organizations can collaborate seamlessly while maintaining 
                complete control over their sensitive information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Our Story</h2>
          <div className="text-gray-600 text-lg leading-relaxed space-y-6">
            <p>
              PedolOne was born from a simple observation: the financial industry was struggling 
              with a fundamental paradox. On one hand, organizations needed to share data to provide 
              better services and comply with regulations. On the other, individuals and companies 
              were increasingly concerned about privacy and data security.
            </p>
            <p>
              Founded in 2023 by a team of cybersecurity experts and fintech veterans, PedolOne 
              set out to solve this challenge by building a platform that doesn't just secure data, 
              but reimagines how it's shared entirely.
            </p>
            <p>
              Today, we serve hundreds of organizations across India, helping them navigate the 
              complex landscape of data privacy regulations while enabling secure, efficient 
              data sharing that benefits everyone involved.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Core Values</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600">
                We believe privacy is a fundamental human right. Every decision we make starts 
                with protecting user data and maintaining transparency.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">User Control</h3>
              <p className="text-gray-600">
                Users should always be in control of their data. We provide the tools and 
                transparency needed for informed consent and data management.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Innovation</h3>
              <p className="text-gray-600">
                We continuously push the boundaries of what's possible in secure data sharing, 
                always looking for better ways to protect and enable.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Award className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Excellence</h3>
              <p className="text-gray-600">
                We strive for excellence in everything we do, from our technology to our 
                customer service and compliance standards.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Impact</h3>
              <p className="text-gray-600">
                We're building solutions that can scale globally, helping organizations 
                worldwide navigate the complex landscape of data privacy.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <Target className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Trust</h3>
              <p className="text-gray-600">
                Trust is earned through consistent, reliable, and secure service. 
                We work hard every day to maintain the trust of our users and partners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Leadership Team</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Rahul Sharma</h3>
              <p className="text-blue-600 font-medium mb-2">CEO & Co-Founder</p>
              <p className="text-gray-600 text-sm">
                Former cybersecurity expert with 15+ years in fintech. 
                Led security teams at major Indian banks.
              </p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Priya Patel</h3>
              <p className="text-blue-600 font-medium mb-2">CTO & Co-Founder</p>
              <p className="text-gray-600 text-sm">
                Technology leader with expertise in distributed systems and 
                privacy-preserving technologies.
              </p>
            </div>

            <div className="text-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="h-12 w-12 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Arjun Kumar</h3>
              <p className="text-blue-600 font-medium mb-2">Head of Product</p>
              <p className="text-gray-600 text-sm">
                Product strategist with deep understanding of regulatory 
                compliance and user experience design.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">PedolOne by the Numbers</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <p className="text-blue-200">Organizations Served</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1M+</div>
              <p className="text-blue-200">Users Protected</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <p className="text-blue-200">Uptime</p>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <p className="text-blue-200">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Data Sharing?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of organizations already using PedolOne to secure their data sharing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/signup/org" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started for Organizations
            </a>
            <a 
              href="/signup/user" 
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Get Started for Individuals
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About; 