import { performance } from 'node:perf_hooks'
import { createLocalClient } from '../lib/local-db/client'
import { store } from '../lib/local-db/store'
import { serializeMockSession } from '../lib/supabase/config'

async function runPerformanceAudit() {
  console.log('====================================================')
  console.log('       GYMFLOW SAAS FULL PERFORMANCE AUDIT          ')
  console.log('====================================================\n')

  // Setup seed user & gym in local store
  const testUserId = 'test-owner-perf-123'
  const testGymId = 'test-gym-perf-123'

  store.setTable('users', [
    {
      id: testUserId,
      email: 'owner@gymflow.test',
      role: 'authenticated',
      user_metadata: { name: 'Gym Owner' },
      created_at: new Date().toISOString()
    }
  ])

  store.setTable('gyms', [
    {
      id: testGymId,
      owner_id: testUserId,
      name: 'Titan Fitness Arena',
      is_active: true,
      subscription_status: 'active',
      plan_type: 'pro',
      trial_ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      subscription_ends_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      onboarding_completed: true,
      onboarding_data: {
        gymName: 'Titan Fitness Arena',
        plans: [
          { planName: 'Monthly General', duration: 'monthly', category: 'both', price: 1500, joiningFee: 500 },
          { planName: 'Annual Pro', duration: 'annual', category: 'both', price: 12000, joiningFee: 0 }
        ]
      },
      created_at: new Date().toISOString()
    }
  ])

  // Seed members and memberships
  const memberList = Array.from({ length: 50 }).map((_, i) => ({
    id: `mem-${i}`,
    gym_id: testGymId,
    member_number: 1000 + i,
    name: `Member ${i}`,
    phone: `+9198765432${i.toString().padStart(2, '0')}`,
    pending_amount: i % 3 === 0 ? 500 : 0,
    area: i % 2 === 0 ? 'Anna Nagar' : 'T. Nagar',
    gender: i % 2 === 0 ? 'male' : 'female',
    created_at: new Date(Date.now() - i * 86400000).toISOString()
  }))
  store.setTable('members', memberList)

  const membershipList = memberList.map((m, i) => ({
    id: `mship-${i}`,
    gym_id: testGymId,
    member_id: m.id,
    plan: 'monthly',
    category: 'both',
    start_date: '2026-09-01',
    end_date: i % 5 === 0 ? '2026-09-15' : '2026-10-01',
    amount: 1500,
    admission_fee: 0,
    payment_mode: 'cash',
    created_at: new Date().toISOString()
  }))
  store.setTable('memberships', membershipList)

  const mockSessionCookie = `gymflow_mock_session=${encodeURIComponent(
    serializeMockSession({ userId: testUserId, email: 'owner@gymflow.test', name: 'Gym Owner' })
  )}`

  // 1. Authenticated SSR Route Latency Test
  console.log('─── 1. AUTHENTICATED SSR PAGE RENDER LATENCY ───')
  const baseUrl = 'http://localhost:3004'
  const authenticatedEndpoints = [
    { name: 'Dashboard (/dashboard)', path: '/dashboard' },
    { name: 'Members List (/members)', path: '/members' },
    { name: 'New Member Page (/members/new)', path: '/members/new' },
    { name: 'Payments (/payments)', path: '/payments' },
    { name: 'Attendance (/attendance)', path: '/attendance' },
    { name: 'Dues (/dues)', path: '/dues' },
    { name: 'Reports (/reports)', path: '/reports' },
    { name: 'Account (/account)', path: '/account' },
    { name: 'Inventory (/inventory)', path: '/inventory' }
  ]

  for (const ep of authenticatedEndpoints) {
    try {
      // Warm up
      await fetch(`${baseUrl}${ep.path}`, {
        headers: { Cookie: mockSessionCookie },
        redirect: 'manual'
      })

      // Benchmark 3 requests
      const times: number[] = []
      let status = 0
      for (let i = 0; i < 3; i++) {
        const start = performance.now()
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { Cookie: mockSessionCookie },
          redirect: 'manual'
        })
        const end = performance.now()
        status = res.status
        times.push(end - start)
      }
      const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
      const min = Math.min(...times).toFixed(1)
      const max = Math.max(...times).toFixed(1)
      console.log(`${ep.name.padEnd(32)} | HTTP ${status} | Avg: ${avg.padStart(6)} ms (Min: ${min.padStart(5)} ms, Max: ${max.padStart(5)} ms)`)
    } catch (e: any) {
      console.log(`${ep.name.padEnd(32)} | ERROR: ${e.message}`)
    }
  }

  // 2. Member Creation Full Flow Latency
  console.log('\n─── 2. MEMBER SAVE FLOW LATENCY (CRITICAL CRUD) ───')
  const db = createLocalClient({ id: testUserId, email: 'owner@gymflow.test' })
  
  const saveTimes: number[] = []
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now()
    // Step 1: Insert Member
    const { data: mem, error: e1 } = await db.from('members').insert({
      gym_id: testGymId,
      name: `Perf Member ${i}`,
      phone: `+91987654000${i}`,
      member_number: 2000 + i,
      pending_amount: 0,
      area: 'Anna Nagar',
      gender: 'male'
    })
    
    // Step 2: Insert Membership
    const { error: e2 } = await db.from('memberships').insert({
      gym_id: testGymId,
      member_id: mem?.id,
      plan: 'monthly',
      category: 'both',
      start_date: '2026-09-17',
      end_date: '2026-10-17',
      amount: 1500,
      payment_mode: 'cash'
    })

    const t1 = performance.now()
    saveTimes.push(t1 - t0)
  }
  const avgSave = (saveTimes.reduce((a, b) => a + b, 0) / saveTimes.length).toFixed(2)
  console.log(`Direct Member + Membership DB Save: Avg: ${avgSave} ms (5 runs: ${saveTimes.map(t => t.toFixed(1) + 'ms').join(', ')})`)

  console.log('\n====================================================')
  console.log('              PERFORMANCE AUDIT COMPLETE            ')
  console.log('====================================================')
}

runPerformanceAudit()
