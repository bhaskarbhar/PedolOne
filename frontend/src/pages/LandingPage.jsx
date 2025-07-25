import { useNavigate } from 'react-router-dom';
import { Briefcase, User, ShieldCheck, LockKeyhole } from "lucide-react";
import { motion } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-white w-full">
      {/* Hero Section */}
      <section className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-900 mb-4 sm:mb-6 leading-tight"
        >
          PedolOne: Secure. Share. Comply.
        </motion.h1>
        <p className="text-base sm:text-lg text-gray-700 max-w-2xl mb-6 sm:mb-8 px-2">
          Empower your organization or personal finance profile with privacy-first data vaulting, controlled sharing, and airtight compliance. Built for the modern fintech ecosystem.
        </p>
        
        {/* Centered Button Container */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '16px', 
          width: '100%', 
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <button 
            onClick={() => navigate('/login/org')}
            style={{ 
              width: '100%', 
              maxWidth: '280px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '500',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            I'm an Organisation
          </button>
          <button 
            onClick={() => navigate('/login/user')}
            style={{ 
              width: '100%', 
              maxWidth: '280px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '500',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#047857'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#059669'}
          >
            I'm an Individual
          </button>
        </div>

        {/* Desktop Layout */}
        <div style={{ 
          display: 'none'
        }} className="sm:flex sm:flex-row sm:gap-6 sm:mt-4">
          <button 
            onClick={() => navigate('/login/org')}
            style={{ 
              minWidth: '200px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '500',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            I'm an Organisation
          </button>
          <button 
            onClick={() => navigate('/login/user')}
            style={{ 
              minWidth: '200px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '500',
              backgroundColor: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#047857'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#059669'}
          >
            I'm an Individual
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ backgroundColor: '#eff6ff', padding: '3rem 1rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '2.5rem' }}>
            Key Features
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
            }}>
              <ShieldCheck style={{ color: '#1d4ed8', width: '40px', height: '40px', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Policy-Bound Access
              </h3>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Fine-grained, contract-wrapped data sharing with full consent and logging controls.
              </p>
            </div>
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
            }}>
              <LockKeyhole style={{ color: '#1d4ed8', width: '40px', height: '40px', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                End-to-End Security
              </h3>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                AES encryption, tokenization, and user-controlled sharing protect every PII asset.
              </p>
            </div>
            <div style={{ 
              padding: '1.5rem', 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' 
            }}>
              <User style={{ color: '#1d4ed8', width: '40px', height: '40px', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Built for Fintech
              </h3>
              <p style={{ color: '#6b7280', fontSize: '1rem' }}>
                Easily integrate with banks, NBFCs, and financial services via secure APIs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ padding: '3rem 1rem', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '1.5rem' }}>
            About PedolOne
          </h2>
          <p style={{ color: '#374151', fontSize: '1.125rem', lineHeight: '1.6' }}>
            PedolOne is a SaaS platform revolutionizing how sensitive financial data is stored and shared. Our vault-first architecture ensures that your user data remains in your control — auditable, consent-driven, and enterprise-ready.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ backgroundColor: '#dbeafe', padding: '3rem 1rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '1rem' }}>
            Get in Touch
          </h2>
          <p style={{ color: '#374151', marginBottom: '1.5rem', fontSize: '1rem' }}>
            Want to partner, integrate, or learn more? We'd love to talk.
          </p>
          <button 
            onClick={() => navigate('/contact')}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '500',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            Contact Us
          </button>
        </div>
      </section>
    </div>
  );
}
