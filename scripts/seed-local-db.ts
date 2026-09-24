import { store } from '../lib/local-db/store'
import {
  DEFAULT_MOCK_USER,
  DEFAULT_MOCK_ADMIN,
} from '../lib/local-db/auth'
import type {
  LocalGym,
  LocalMember,
  LocalMembership,
  LocalDuePayment,
  LocalAttendance,
  LocalInventoryItem,
} from '../lib/local-db/types'




async function seed() {
  console.log('🌱 Starting GymFlow Local Database Seeding...')

  const todayStr = new Date().toISOString().split('T')[0]
  const today = new Date(todayStr)

  // 1. Seed Users
  store.setTable('users', [DEFAULT_MOCK_USER, DEFAULT_MOCK_ADMIN])

  // 2. Seed Gym
  const gymId = '11111111-1111-1111-1111-111111111111'
  const gyms: LocalGym[] = [
    {
      id: gymId,
      name: 'PowerFit Gym & Fitness Hub Lahore',
      owner_id: DEFAULT_MOCK_USER.id,
      is_active: true,
      onboarding_completed: true,
      subscription_status: 'active',
      phone: '+923001234567',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]
  store.setTable('gyms', gyms)

  // 3. Seed Members
  const memberNames = [
    { name: 'Ahmed Raza', phone: '+923001234567', gender: 'male', area: 'Gulberg' },
    { name: 'Ayesha Khan', phone: '+923002345678', gender: 'female', area: 'DHA' },
    { name: 'Bilal Hassan', phone: '+923003456789', gender: 'male', area: 'Johar Town' },
    { name: 'Fatima Noor', phone: '+923004567890', gender: 'female', area: 'Model Town' },
    { name: 'Usman Ali', phone: '+923005678901', gender: 'male', area: 'Cantt' },
    { name: 'Zainab Bibi', phone: '+923006789012', gender: 'female', area: 'Faisal Town' },
    { name: 'Hamza Tariq', phone: '+923007890123', gender: 'male', area: 'Bahria Town' },
    { name: 'Maryam Siddiqui', phone: '+923008901234', gender: 'female', area: 'Wapda Town' },
  ] as const

  const members: LocalMember[] = []
  const memberships: LocalMembership[] = []
  const duePayments: LocalDuePayment[] = []
  const attendances: LocalAttendance[] = []

  memberNames.forEach((m, idx) => {
    const memberId = `22222222-2222-2222-2222-22222222220${idx + 1}`
    const memberNum = 101 + idx
    const pendingAmount = idx === 2 ? 1500 : idx === 4 ? 500 : 0

    members.push({
      id: memberId,
      gym_id: gymId,
      member_number: memberNum,
      name: m.name,
      phone: m.phone,
      gender: m.gender,
      area: m.area,
      pending_amount: pendingAmount,
      created_at: new Date(Date.now() - (40 - idx * 3) * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Create memberships:
    // idx 0, 1: active (expires in 30 days)
    // idx 2, 3: expiring this week (expires in 3 days)
    // idx 4: expired 5 days ago
    // idx 5, 6, 7: active (expires in 60 days)
    let startDate: string
    let endDate: string
    if (idx === 2 || idx === 3) {
      // Expiring in 3 days
      const s = new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000)
      const e = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      startDate = s.toISOString().split('T')[0]
      endDate = e.toISOString().split('T')[0]
    } else if (idx === 4) {
      // Expired 5 days ago
      const s = new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000)
      const e = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)
      startDate = s.toISOString().split('T')[0]
      endDate = e.toISOString().split('T')[0]
    } else {
      // Active
      const s = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
      const e = new Date(today.getTime() + 50 * 24 * 60 * 60 * 1000)
      startDate = s.toISOString().split('T')[0]
      endDate = e.toISOString().split('T')[0]
    }

    memberships.push({
      id: `33333333-3333-3333-3333-33333333330${idx + 1}`,
      member_id: memberId,
      gym_id: gymId,
      plan: idx % 3 === 0 ? 'annual' : idx % 2 === 0 ? 'quarterly' : 'monthly',
      category: 'both',
      start_date: startDate,
      end_date: endDate,
      amount: idx % 3 === 0 ? 12000 : idx % 2 === 0 ? 4500 : 1800,
      admission_fee: idx === 0 ? 500 : 0,
      due_amount: pendingAmount,
      payment_mode: idx % 2 === 0 ? 'upi' : 'cash',
      created_at: new Date(startDate).toISOString(),
    })

    // Dues for member 2 and 4
    if (pendingAmount > 0) {
      duePayments.push({
        id: `44444444-4444-4444-4444-44444444440${idx + 1}`,
        gym_id: gymId,
        member_id: memberId,
        amount: 500,
        payment_mode: 'cash',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    // Attendance for some members today
    if (idx < 5) {
      attendances.push({
        id: `55555555-5555-5555-5555-55555555550${idx + 1}`,
        member_id: memberId,
        gym_id: gymId,
        date: todayStr,
        session: idx % 2 === 0 ? 'morning' : 'evening',
        created_at: new Date().toISOString(),
        check_out_time: null,
      })
    }
  })

  // 4. Seed Inventory
  const inventory: LocalInventoryItem[] = [
    {
      id: '66666666-6666-6666-6666-666666666601',
      gym_id: gymId,
      name: 'Optimum Nutrition Gold Standard Whey (1kg)',
      category: 'Supplements',
      quantity: 12,
      unit_price: 2400,
      selling_price: 3200,
      min_stock_alert: 5,
      created_at: new Date().toISOString(),
    },
    {
      id: '66666666-6666-6666-6666-666666666602',
      gym_id: gymId,
      name: 'GymFlow Pro Shaker Bottle (700ml)',
      category: 'Accessories',
      quantity: 25,
      unit_price: 150,
      selling_price: 350,
      min_stock_alert: 10,
      created_at: new Date().toISOString(),
    },
    {
      id: '66666666-6666-6666-6666-666666666603',
      gym_id: gymId,
      name: 'Heavy Duty Weightlifting Wrist Wraps',
      category: 'Gear',
      quantity: 8,
      unit_price: 300,
      selling_price: 600,
      min_stock_alert: 3,
      created_at: new Date().toISOString(),
    },
  ]

  // 5. Atomically reset and persist to disk
  store.reset({
    users: [DEFAULT_MOCK_USER, DEFAULT_MOCK_ADMIN],
    gyms,
    members,
    memberships,
    due_payments: duePayments,
    attendance: attendances,
    inventory,
  })


  console.log('✅ Local Database successfully seeded!')
  console.log(`   - 🏢 Gyms: ${gyms.length} (${gyms[0].name})`)
  console.log(`   - 👤 Users: ${DEFAULT_MOCK_USER.email} (Owner), ${DEFAULT_MOCK_ADMIN.email} (Admin)`)
  console.log(`   - 🏋️ Members: ${members.length}`)
  console.log(`   - 📋 Memberships: ${memberships.length}`)
  console.log(`   - ⏱️ Attendance today: ${attendances.length}`)
  console.log(`   - 📦 Inventory items: ${inventory.length}`)
  console.log('\n📁 Database state saved to .local-db/data.json')
}

seed().catch((err) => {
  console.error('❌ Failed to seed local database:', err)
  process.exit(1)
})
