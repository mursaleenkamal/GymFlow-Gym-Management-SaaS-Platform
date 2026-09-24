import React, { useEffect, useState } from 'react';
import { 
  X, Shield, FileText, Headphones, Mail, 
  MessageSquare, CheckCircle2, Clock, Send, Copy, Check 
} from 'lucide-react';

export type ModalTab = 'privacy' | 'terms' | 'support' | 'contact' | null;

interface FooterModalsProps {
  activeTab: ModalTab;
  onClose: () => void;
  onTabChange: (tab: ModalTab) => void;
}

export function FooterModals({ activeTab, onClose, onTabChange }: FooterModalsProps) {
  const [copied, setCopied] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    gymName: '',
    phone: '',
    message: ''
  });

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (activeTab) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, onClose]);

  if (!activeTab) return null;

  const copyEmail = () => {
    navigator.clipboard.writeText('support@gymflow.sbs');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSent(true);
    setTimeout(() => {
      setFormSent(false);
      setContactForm({ name: '', gymName: '', phone: '', message: '' });
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        className="relative z-10 w-full max-w-[850px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        style={{ animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <img src="/logo_only.png" alt="GymFlow" className="w-7 h-7 object-contain" />
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => onTabChange('privacy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'privacy' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Privacy
              </button>
              <button
                onClick={() => onTabChange('terms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'terms' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Terms
              </button>
              <button
                onClick={() => onTabChange('support')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'support' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Support
              </button>
              <button
                onClick={() => onTabChange('contact')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'contact' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Contact
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 text-slate-700 custom-scrollbar">
          
          {/* ─── PRIVACY TAB ─── */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Privacy Policy</h2>
                  <p className="text-xs text-slate-500">Last updated: September 2026 • GymFlow Pakistan</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4">
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-blue-900 text-xs leading-relaxed">
                  <strong>GymFlow Commitment:</strong> Your gym data, member records, and financial details belong strictly to you. We do not sell or monetize your members' contact information to third parties.
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-4">1. Information We Collect</h3>
                <p>When you register and use GymFlow, we process information necessary to manage your gym:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Account Data:</strong> Owner name, gym name, phone number, and login credentials.</li>
                  <li><strong>Gym Operations:</strong> Member names, contact numbers, membership plans, admission dates, and attendance records.</li>
                  <li><strong>Billing & Dues:</strong> Fee collections, pending dues, payment receipts, and subscription records.</li>
                </ul>

                <h3 className="text-base font-bold text-slate-900 mt-4">2. Multi-Tenant Data Isolation</h3>
                <p>
                  Every gym on GymFlow operates within an isolated tenant environment. Your data cannot be viewed, accessed, or queried by other gym owners on the platform.
                </p>

                <h3 className="text-base font-bold text-slate-900 mt-4">3. WhatsApp Communication</h3>
                <p>
                  GymFlow provides automated WhatsApp notifications (due reminders, welcome messages, renewals) sent on your behalf. These messages are sent strictly according to your automated rules, and contact numbers are used exclusively for your gym's official alerts.
                </p>

                <h3 className="text-base font-bold text-slate-900 mt-4">4. Data Ownership & Export</h3>
                <p>
                  You retain complete ownership of your data at all times. You can export your member lists, dues reports, and financial logs to Excel/CSV anytime with one click.
                </p>

                <h3 className="text-base font-bold text-slate-900 mt-4">5. Contact Privacy Office</h3>
                <p>
                  If you have questions regarding data privacy or wish to request data deletion, contact us at{' '}
                  <a href="mailto:support@gymflow.sbs" className="text-blue-600 font-semibold underline">support@gymflow.sbs</a>.
                </p>
              </div>
            </div>
          )}

          {/* ─── TERMS TAB ─── */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Terms of Service</h2>
                  <p className="text-xs text-slate-500">Effective: 2026 • GymFlow SaaS Platform</p>
                </div>
              </div>

              <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4">
                <h3 className="text-base font-bold text-slate-900 mt-4">1. Service Agreement</h3>
                <p>
                  By creating an account on GymFlow, you agree to these Terms. GymFlow provides cloud-based gym management software designed for independent gym owners across Pakistan.
                </p>

                <h3 className="text-base font-bold text-slate-900 mt-4">2. Free Trial & Subscriptions</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>14-Day Free Trial:</strong> Full access to all features with no credit card required upfront.</li>
                  <li><strong>Standard Plan:</strong> <strong>PKR 3,000 / month</strong> flat fee for unlimited members, attendance, and features.</li>
                  <li><strong>Payment Methods:</strong> Subscription payments are accepted via Bank Transfer, Easypaisa, JazzCash, or credit/debit card.</li>
                </ul>

                <h3 className="text-base font-bold text-slate-900 mt-4">3. Fair & Responsible Usage</h3>
                <p>
                  You agree to use GymFlow for legitimate gym and fitness studio management. You agree not to send abusive or unsolicited spam through the automated WhatsApp messaging system.
                </p>

                <h3 className="text-base font-bold text-slate-900 mt-4">4. Cancellation & Refund Policy</h3>
                <p>
                  You can cancel your subscription at any time without penalty. Since GymFlow offers a 14-day free trial to test all capabilities before paying, monthly subscription fees once activated are non-refundable.
                </p>

                <h3 className="text-base font-bold text-slate-900 mt-4">5. Service Availability & Uptime</h3>
                <p>
                  We strive for 99.9% uptime. Automated daily database backups ensure your records are secure and recoverable.
                </p>
              </div>
            </div>
          )}

          {/* ─── SUPPORT TAB ─── */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">GymFlow Support</h2>
                  <p className="text-xs text-slate-500">Dedicated assistance for Pakistani gym owners</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                {/* WhatsApp Support Card */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-base mb-1">
                      <MessageSquare className="w-5 h-5" />
                      WhatsApp Helpline
                    </div>
                    <p className="text-xs text-slate-600 mb-4">
                      Chat directly with our technical team for instant onboarding and troubleshooting.
                    </p>
                  </div>
                  <a
                    href="https://wa.me/923001234567?text=Hello%20GymFlow%20Support%2C%20I%20need%20assistance%20with%20my%20gym"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                  >
                    Open WhatsApp Chat
                  </a>
                </div>

                {/* Email Support Card */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-base mb-1">
                      <Mail className="w-5 h-5" />
                      Email Desk
                    </div>
                    <p className="text-xs text-slate-600 mb-4">
                      Official email inquiries for account verification, invoicing, and feature requests.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyEmail}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy support@gymflow.sbs'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Assistance list */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-3">How We Can Help:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Free Excel/CSV member list import</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>WhatsApp template setup & verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Easypaisa / JazzCash payment activation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Staff training & quick walkthroughs</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Operating hours: Monday – Saturday (9:00 AM – 9:00 PM PKT). Typical response &lt; 30 mins.</span>
              </div>
            </div>
          )}

          {/* ─── CONTACT TAB ─── */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-blue-600 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Get in Touch</h2>
                  <p className="text-xs text-slate-500">Have questions about GymFlow? We're here to help.</p>
                </div>
              </div>

              {formSent ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Message Received!</h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Thank you for reaching out. A GymFlow representative will contact you via WhatsApp or phone shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                      <input 
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="e.g. Asad Malik"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Gym Name</label>
                      <input 
                        type="text"
                        required
                        value={contactForm.gymName}
                        onChange={e => setContactForm({ ...contactForm, gymName: e.target.value })}
                        placeholder="e.g. Power Gym Lahore"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Phone Number</label>
                    <input 
                      type="tel"
                      required
                      value={contactForm.phone}
                      onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="0300-1234567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Message or Questions</label>
                    <textarea 
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Tell us about your gym, how many members you manage, or what questions you have..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">Direct response via WhatsApp or call</span>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-md shadow-blue-500/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 GymFlow Pakistan. All rights reserved.</span>
          <button 
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
