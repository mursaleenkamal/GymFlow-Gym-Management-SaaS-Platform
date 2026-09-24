'use server'

import { createClient } from '@/lib/supabase/server'
import { cacheWrapper, deleteCache } from '@/lib/cache'
import { cacheKeys } from '@/lib/cache-keys'

export interface CollectDuePaymentInput {
  gymId: string
  memberId: string
  amount: number
  paymentMode: string
  phone?: string
  memberName?: string
}

export async function collectDuePaymentAction(input: CollectDuePaymentInput) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Unauthorized')

    // 1. Fetch current pending amount
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('id, name, phone, pending_amount')
      .eq('id', input.memberId)
      .eq('gym_id', input.gymId)
      .single()

    if (memberErr || !member) throw new Error('Member not found')

    const currentPending = member.pending_amount || 0
    const newPending = Math.max(0, currentPending - input.amount)

    // 2. Insert due payment record
    const { error: insertErr } = await supabase.from('due_payments').insert({
      gym_id: input.gymId,
      member_id: input.memberId,
      amount: input.amount,
      payment_mode: input.paymentMode,
      created_at: new Date().toISOString(),
    })
    if (insertErr) throw insertErr

    // 3. Update member pending amount
    const { error: updateErr } = await supabase
      .from('members')
      .update({ pending_amount: newPending })
      .eq('id', input.memberId)
    if (updateErr) throw updateErr

    // 4. Background Outbox tasks: WhatsApp notification + cache invalidation
    if (newPending === 0 && member.phone && member.phone.length >= 10) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/whatsapp/automation/due-cleared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gymId: input.gymId,
          memberId: member.id,
          phone: member.phone,
          dueDate: new Date().toISOString().slice(0, 10),
        }),
      }).catch(() => {})
    }

    // Invalidate caches in background without blocking response
    Promise.all([
      deleteCache(cacheKeys.membersList(input.gymId)),
      deleteCache(`gym:${input.gymId}:payments_page:12mo`),
      deleteCache(`gym:${input.gymId}:payments_page:allTime`),
      deleteCache(`gym:${input.gymId}:dues_list`),
    ]).catch(() => {})

    return {
      success: true,
      data: {
        newPending,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to collect payment' }
  }
}

export async function getAllTimePayments(gymId: string) {
  // Auth gate — MUST run before cache lookup.
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('id', gymId)
    .eq('owner_id', user.id)
    .single()
  if (!gym) throw new Error('Forbidden')

  const cacheKey = `gym:${gymId}:payments_page:allTime`

  return cacheWrapper(cacheKey, 300, async () => {
    const [paymentsRes, productSalesRes, duePaymentsRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('id, member_id, plan, start_date, end_date, amount, admission_fee, due_amount, payment_mode, created_at, member:members(id, name, phone, member_number)')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(5000),
      supabase
        .from('inventory_sales')
        .select('id, product_name, variant_name, quantity, unit_price, total_price, payment_mode, sold_at')
        .eq('gym_id', gymId)
        .order('sold_at', { ascending: false })
        .limit(2000),
      supabase
        .from('due_payments')
        .select('id, member_id, amount, payment_mode, created_at, member:members(id, name, phone, member_number)')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(2000),
    ])

    const rawPayments = paymentsRes.data ?? []
    const rawDuePayments = duePaymentsRes.data ?? []

    const payments = rawPayments.map((p: any) => ({
      ...p,
      member: Array.isArray(p.member) ? p.member[0] : p.member,
    }))
    const duePayments = rawDuePayments.map((dp: any) => ({
      ...dp,
      member: Array.isArray(dp.member) ? dp.member[0] : dp.member,
    }))

    const missingMemberIds = Array.from(
      new Set([
        ...payments.filter((p: any) => !p.member?.name && p.member_id).map((p: any) => p.member_id),
        ...duePayments.filter((dp: any) => !dp.member?.name && dp.member_id).map((dp: any) => dp.member_id),
      ])
    )

    if (missingMemberIds.length > 0) {
      const { data: missingMembers } = await supabase
        .from('members')
        .select('id, name, phone, member_number')
        .in('id', missingMemberIds)

      if (missingMembers && missingMembers.length > 0) {
        const memberMap = new Map(missingMembers.map((m: any) => [m.id, m]))
        for (const p of payments) {
          if (!p.member?.name && p.member_id && memberMap.has(p.member_id)) {
            p.member = memberMap.get(p.member_id)
          }
        }
        for (const dp of duePayments) {
          if (!dp.member?.name && dp.member_id && memberMap.has(dp.member_id)) {
            dp.member = memberMap.get(dp.member_id)
          }
        }
      }
    }

    return {
      payments,
      productSales: productSalesRes.data ?? [],
      duePayments,
    }
  })
}
