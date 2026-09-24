'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, ArrowLeft, ArrowRight, Check, Shield, AlertCircle, Sparkles } from 'lucide-react'

// ─── Animated Grid Background ───────────────────────────────────────────────────

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-brand-400/20 to-violet-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-cyan-400/15 to-emerald-400/10 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />

      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-forgot" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-forgot)" />
      </svg>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send reset link. Please try again.')
        setLoading(false)
        return
      }

      setSent(true)
      if (data.devLink) {
        setDevLink(data.devLink)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ─── LEFT PANEL: Dark branded hero ─── */}
      <div className="hidden lg:flex lg:w-[50%] relative bg-[#0B0F1A] flex-col p-10 xl:p-14 overflow-hidden">
        <GridBackground />

        {/* Top: Logo */}
        <div className={`relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image src="/logo_only.png" alt="GymFlow Logo" width={40} height={40} className="object-contain drop-shadow-md" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">gymflow</span>
          </Link>
        </div>

        {/* Center: Info */}
        <div className={`relative z-10 mt-20 space-y-6 max-w-md transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-400/20">
            <Shield className="w-3.5 h-3.5 text-brand-300" />
            <span className="text-[11px] font-bold text-brand-300 uppercase tracking-wider">Account Security</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-black text-white leading-tight tracking-tight">
            Account recovery made simple and secure.
          </h1>

          <p className="text-sm text-white/50 leading-relaxed font-medium">
            Don&apos;t worry if you forgot your password. Enter your registered email and we&apos;ll help you regain access in seconds.
          </p>

          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-xs text-white/70 font-medium">Encrypted one-time secure reset link</p>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-400/20 flex items-center justify-center text-brand-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs text-white/70 font-medium">Instant verification and password setup</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 mt-auto">
          <p className="text-[11px] text-white/20 font-medium">
            © {new Date().getFullYear()} gymflow. Built for gym owners across Pakistan.
          </p>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Form ─── */}
      <div className="flex-1 flex flex-col bg-[#FAFBFD] lg:bg-white min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 xs:p-6 pb-0">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo_only.png" alt="GymFlow Logo" width={32} height={32} className="object-contain" />
            <span className="text-base font-black text-slate-900 tracking-tight">gymflow</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Sign in
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 xs:px-6 py-8 xs:py-12">
          <div className={`w-full max-w-[400px] transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            {/* Back link (desktop) */}
            <div className="hidden lg:block mb-6">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign in
              </Link>
            </div>

            {!sent ? (
              <>
                <div className="mb-7">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-brand-600 mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Forgot password?</h2>
                  <p className="text-sm text-slate-500 mt-1.5 font-medium leading-relaxed">
                    Enter the email address associated with your gym account and we&apos;ll send you a password reset link.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold animate-slide-up">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@powerfit.com"
                      className="w-full h-12 px-4 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-12 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    Remember your password?{' '}
                    <Link href="/auth/login" className="text-brand-600 font-bold hover:text-brand-700 transition-colors">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-2 animate-slide-up space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-8 h-8" strokeWidth={2.5} />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Check your email</h2>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    We&apos;ve sent a password reset link to <strong className="text-slate-800">{email}</strong>. Please click the link in your email to set a new password.
                  </p>
                </div>

                {devLink && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-2">
                    <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Development Mode Shortcut
                    </p>
                    <p className="text-xs text-amber-700">
                      You can click below to simulate clicking the email link immediately:
                    </p>
                    <a
                      href={devLink}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-white px-3 py-2 rounded-lg border border-amber-300 hover:bg-amber-100 transition-all shadow-sm break-all"
                    >
                      Open Password Setup Page ➔
                    </a>
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  <Link
                    href="/auth/login"
                    className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    Return to Sign In
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSent(false)
                      setError('')
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Didn&apos;t get the email? Try again
                  </button>
                </div>
              </div>
            )}

            {/* Bottom secure badge */}
            <div className="mt-12 flex items-center justify-center gap-2 text-[11px] text-slate-300 font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>Secured with end-to-end encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
