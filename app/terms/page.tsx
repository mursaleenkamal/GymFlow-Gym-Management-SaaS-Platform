import Link from 'next/link'
import { FileText, Shield, ArrowLeft, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Terms & Conditions — GymFlow',
  description: 'GymFlow Terms and Conditions of Service for gym owners in Pakistan.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#070B14] text-slate-300 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-[#0D1527] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Terms &amp; Conditions</h1>
              <p className="text-xs text-slate-400">GymFlow SaaS Platform • Pakistan</p>
            </div>
          </div>
          <Link
            href="/auth/create-account"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign Up
          </Link>
        </div>

        {/* Highlight box */}
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 text-brand-300 text-xs sm:text-sm leading-relaxed mb-8 flex items-start gap-3">
          <Shield className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
          <span>
            GymFlow provides complete gym management software tailored for independent gym owners across Pakistan. By using the platform, you agree to these clear terms.
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              1. 14-Day Free Pro Trial
            </h2>
            <p className="text-slate-400">
              Every new gym receives immediate access to a free 14-day Pro trial upon account creation. You can explore all features with zero payment details required upfront.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              2. Flat Monthly Pricing
            </h2>
            <p className="text-slate-400">
              Subscription pricing is fixed at <strong>PKR 3,000 / month</strong> flat. There are no hidden fees, no per-member penalties, and no surprise charges.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              3. Payment &amp; Activation
            </h2>
            <p className="text-slate-400">
              Payments are accepted via Bank Transfer, Easypaisa, JazzCash, or Debit/Credit Card. Subscriptions are activated swiftly upon receipt verification.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              4. Complete Data Ownership
            </h2>
            <p className="text-slate-400">
              You retain 100% full legal ownership of your members&apos; data, contact numbers, and billing records. GymFlow never sells, shares, or monetizes your data. You can export your full records to CSV/Excel at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              5. WhatsApp Automation Guidelines
            </h2>
            <p className="text-slate-400">
              Automated WhatsApp alerts (payment receipts, due reminders, renewal alerts) must be used solely for legitimate gym management communications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400" />
              6. Cancellation Policy
            </h2>
            <p className="text-slate-400">
              You can cancel your subscription at any time with no lock-in contracts or exit fees.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 mt-10 pt-6 flex items-center justify-between text-xs text-slate-500">
          <span>&copy; 2026 GymFlow. All rights reserved.</span>
          <Link
            href="/auth/create-account"
            className="text-brand-400 hover:text-brand-300 font-semibold"
          >
            Create Account &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
