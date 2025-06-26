import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Briefcase, User, ShieldCheck, LockKeyhole } from "lucide-react";
import { motion } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-white">
      <section className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold text-blue-900 mb-6"
        >
          SecureVault: Secure. Share. Comply.
        </motion.h1>
        <p className="text-lg text-gray-700 max-w-2xl mb-8">
          Empower your organization or personal finance profile with privacy-first data vaulting, controlled sharing, and airtight compliance. Built for the modern fintech ecosystem.
        </p>
        <div className="flex gap-6">
          <Button onClick={() => navigate('/login/org')}>I’m an Organisation</Button>
          <Button onClick={() => navigate('/login/user')}>I’m an Individual</Button>
        </div>
      </section>

      <section id="features" className="bg-blue-50 py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-blue-900 mb-10">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="p-6 bg-white shadow rounded-lg">
              <ShieldCheck className="text-blue-700 w-10 h-10 mb-4 mx-auto" />
              <h3 className="font-semibold text-xl mb-2">Policy-Bound Access</h3>
              <p className="text-gray-600">Fine-grained, contract-wrapped data sharing with full consent and logging controls.</p>
            </div>
            <div className="p-6 bg-white shadow rounded-lg">
              <LockKeyhole className="text-blue-700 w-10 h-10 mb-4 mx-auto" />
              <h3 className="font-semibold text-xl mb-2">End-to-End Security</h3>
              <p className="text-gray-600">AES encryption, tokenization, and user-controlled sharing protect every PII asset.</p>
            </div>
            <div className="p-6 bg-white shadow rounded-lg">
              <User className="text-blue-700 w-10 h-10 mb-4 mx-auto" />
              <h3 className="font-semibold text-xl mb-2">Built for Fintech</h3>
              <p className="text-gray-600">Easily integrate with banks, NBFCs, and financial services via secure APIs.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-blue-900 mb-6">About SecureVault</h2>
          <p className="text-gray-700 text-lg">
            SecureVault is a SaaS platform revolutionizing how sensitive financial data is stored and shared. Our vault-first architecture ensures that your user data remains in your control — auditable, consent-driven, and enterprise-ready.
          </p>
        </div>
      </section>

      <section id="contact" className="bg-blue-100 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-blue-900 mb-4">Get in Touch</h2>
          <p className="text-gray-700 mb-6">Want to partner, integrate, or learn more? We’d love to talk.</p>
          <Button>Email Us</Button>
        </div>
      </section>
    </div>
  );
}
