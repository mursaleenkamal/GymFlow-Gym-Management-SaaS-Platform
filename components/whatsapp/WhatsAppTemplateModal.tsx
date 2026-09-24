'use client'

/**
 * WhatsAppTemplateModal
 *
 * Supports two sending modes:
 * 1. Free Mode (wa.me): Opens WhatsApp Web/App directly with pre-filled message.
 *    - 100% Free, Zero API cost, No Meta developer account or keys required.
 * 2. Meta Cloud API Mode: Sends official Meta template in the background.
 *    - Requires Meta WhatsApp Business API credentials in .env.local.
 */

import { useState, useEffect } from 'react'
import { X, MessageCircle, Send, Loader2, CheckCircle2, AlertCircle, ExternalLink, Sparkles } from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import type { TemplateId, TemplateContext } from '@/lib/whatsapp/sender'

// ─── Template display metadata ────────────────────────────────────────────────

interface TemplateMeta {
  id: TemplateId
  label: string
  emoji: string
  description: string
  preview: (ctx: TemplateContext) => string
}

function planLabel(plan?: string): string {
  if (!plan) return 'Membership'
  const map: Record<string, string> = {
    monthly:   'Monthly',
    quarterly: 'Quarterly (3 Months)',
    annual:    'Annual (12 Months)',
  }
  return map[plan.toLowerCase()] ?? plan.charAt(0).toUpperCase() + plan.slice(1)
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: '_gymflow_welcome_member',
    label: 'Welcome Member',
    emoji: '🎉',
    description: 'Send when a new member joins',
    preview: (ctx) =>
      `Welcome to ${ctx.gymName || 'our gym'}!\n\nHi ${ctx.memberName}, your ${planLabel(ctx.plan)} membership starts on ${ctx.startDate ? formatDate(ctx.startDate) : 'today'}. Welcome aboard! 💪`,
  },
  {
    id: 'membership_renewed',
    label: 'Membership Renewed',
    emoji: '✅',
    description: 'Send after a successful renewal',
    preview: (ctx) =>
      `Hi ${ctx.memberName}! ✅\n\nYour ${planLabel(ctx.plan)} membership at ${ctx.gymName || 'our gym'} has been renewed.\nValid until: ${ctx.validUntil ? formatDate(ctx.validUntil) : '—'} 🏋️`,
  },
  {
    id: 'membership_expiry_reminder',
    label: 'Expiry Reminder',
    emoji: '⏰',
    description: 'Send 7, 3 or 1 day before expiry',
    preview: (ctx) =>
      `Hi ${ctx.memberName}! ⏰\n\nYour ${planLabel(ctx.plan)} membership expires on ${ctx.expiryDate ? formatDate(ctx.expiryDate) : 'soon'} (${ctx.daysRemaining ?? 0} days left). Renew now to keep your streak going! 💪`,
  },
  {
    id: 'membership_expired',
    label: 'Membership Expired',
    emoji: '🔴',
    description: 'Send when membership has expired',
    preview: (ctx) =>
      `Hi ${ctx.memberName}! 🔴\n\nYour ${planLabel(ctx.plan)} membership at ${ctx.gymName || 'our gym'} has expired on ${ctx.expiryDate ? formatDate(ctx.expiryDate) : 'recently'}. Renew today to get back on track! 💪🏋️`,
  },
  {
    id: 'payment_due_reminder',
    label: 'Payment Due',
    emoji: '💰',
    description: 'Send when a member has a pending due',
    preview: (ctx) =>
      `Hi ${ctx.memberName}! 💰\n\nYou have a pending payment of ${formatCurrency(ctx.dueAmount ?? 0)} at ${ctx.gymName || 'our gym'}. Please clear your dues at your earliest convenience. 🙏`,
  },
  {
    id: '_birthday_wishes',
    label: 'Birthday Wishes',
    emoji: '🎂',
    description: "Marketing — send on member's birthday",
    preview: (ctx) =>
      `Happy Birthday, ${ctx.memberName}! 🎂🎉\n\nWishing you strength, health and happiness from all of us at ${ctx.gymName || 'our gym'}. Keep crushing those goals! 💪`,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats phone number into standard international format for wa.me links
 * Auto-handles Pakistan (92) and India (91) based on number characteristics.
 */
export function buildWaMeUrl(phone: string, text: string): string {
  let clean = phone.replace(/\D/g, '')

  // Remove leading 0 if present (e.g. 03002485885 -> 3002485885)
  while (clean.startsWith('0')) {
    clean = clean.slice(1)
  }

  // If already prefixed with 92 or 91 with full length
  if ((clean.startsWith('92') || clean.startsWith('91')) && clean.length >= 11) {
    // Valid as is
  } else if (clean.length === 10) {
    // 3xx xxx xxxx is standard Pakistan mobile format
    if (clean.startsWith('3')) {
      clean = `92${clean}`
    } else if (/^[6-9]/.test(clean)) {
      clean = `91${clean}`
    } else {
      // Default to 92 (matches GymFlow PKR default currency)
      clean = `92${clean}`
    }
  } else if (clean.length < 10) {
    clean = `92${clean}`
  }

  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface Props {
  open: boolean
  onClose: () => void
  context: TemplateContext
  defaultTemplate?: TemplateId
  /**
   * When true, the member was created via Excel/CSV import. The welcome
   * template is an onboarding message for brand-new members only, so it is
   * removed from the picker and can never be selected for imported members.
   */
  isImported?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WhatsAppTemplateModal({
  open,
  onClose,
  context,
  defaultTemplate = '_gymflow_welcome_member',
  isImported = false,
}: Props) {
  // Imported members never see the welcome template.
  const templates = isImported
    ? TEMPLATES.filter((t) => t.id !== '_gymflow_welcome_member')
    : TEMPLATES

  // Clamp an incoming welcome default to a valid template for imported members.
  const initialId: TemplateId =
    isImported && defaultTemplate === '_gymflow_welcome_member'
      ? templates[0].id
      : defaultTemplate

  const [selectedId, setSelectedId] = useState<TemplateId>(initialId)
  const [mode, setMode] = useState<'free' | 'api'>('free')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Reset state when modal opens / default changes
  useEffect(() => {
    if (open) {
      setSelectedId(initialId)
      setStatus('idle')
      setErrorMsg('')
    }
  }, [open, initialId])

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0]
  const previewText = selected.preview(context)

  // 100% Free Send via wa.me (opens WhatsApp Web / App)
  function handleFreeSend() {
    const url = buildWaMeUrl(context.phone, previewText)
    window.open(url, '_blank')
    setStatus('success')
    setTimeout(() => {
      onClose()
    }, 1200)
  }

  // Official Meta Cloud API Send (Background)
  async function handleApiSend() {
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedId, context }),
      })

      const data = (await res.json()) as { success: boolean; error?: string }

      if (!data.success) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to send message via API')
        return
      }

      setStatus('success')
      setTimeout(onClose, 1500)
    } catch (err) {
      setStatus('error')
      setErrorMsg('Network error — please try again or use Free WhatsApp')
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={status === 'sending' ? undefined : onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-2xl max-h-[92vh] max-w-2xl mx-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Send WhatsApp</h2>
              <p className="text-xs text-slate-400">
                to {context.memberName} · {context.phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'sending'}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-400 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector (Free vs Meta API) */}
        <div className="px-5 pt-3 pb-1">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('free')
                setErrorMsg('')
                if (status === 'error') setStatus('idle')
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all',
                mode === 'free'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp Web / App</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold uppercase">
                Free
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('api')
                setErrorMsg('')
                if (status === 'error') setStatus('idle')
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all',
                mode === 'api'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Meta Cloud API</span>
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {status === 'success' && (
          <div className="mx-5 mt-3 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-700">
              {mode === 'free' ? 'Opened in WhatsApp!' : 'Message sent successfully!'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="mx-5 mt-3 bg-red-50 border border-red-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-red-700">{errorMsg}</p>
                <p className="text-[11px] text-red-600 mt-0.5">
                  Meta Cloud API is not configured or failed. You can send this message completely free without any API setup.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFreeSend}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send for Free via WhatsApp Now
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Template list */}
          <div className="px-5 pt-3 pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">
              Choose Template
            </p>
            <div className="space-y-2">
              {templates.map((t) => {
                const active = selectedId === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    disabled={status === 'sending'}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all disabled:opacity-40',
                      active
                        ? 'border-emerald-400 bg-emerald-50/70'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <span className="text-xl flex-shrink-0">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-bold',
                          active ? 'text-emerald-800' : 'text-slate-800'
                        )}
                      >
                        {t.label}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{t.description}</p>
                    </div>
                    {active && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Message preview */}
          <div className="px-5 pt-2 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Message Preview
              </p>
              {mode === 'free' && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Pre-filled for WhatsApp
                </span>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 relative">
              <pre className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewText}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 bg-white space-y-2">
          {mode === 'free' ? (
            <>
              <button
                type="button"
                onClick={handleFreeSend}
                disabled={status === 'sending'}
                className={cn(
                  'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all',
                  'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200',
                  'active:scale-[0.98] hover:shadow-emerald-300'
                )}
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open in WhatsApp (Free)</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </button>
              <p className="text-[11px] text-center text-slate-400">
                100% Free • Opens WhatsApp Web or App with pre-filled message
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleApiSend}
                disabled={status === 'sending' || status === 'success'}
                className={cn(
                  'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm transition-all',
                  'bg-slate-900 text-white shadow-lg shadow-slate-200',
                  'active:scale-[0.98] hover:bg-slate-800',
                  'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending via API…
                  </>
                ) : status === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send via Meta Cloud API
                  </>
                )}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleFreeSend}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-2"
                >
                  Or send for free using WhatsApp Web / App
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
