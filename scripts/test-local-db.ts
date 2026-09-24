(process.env as Record<string, string | undefined>).NODE_ENV = 'test'
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createLocalClient } from '../lib/local-db/client'
import { store } from '../lib/local-db/store'


describe('GymFlow Local Database Environment (Zero-Docker)', () => {
  beforeEach(() => {
    store.reset()
  })

  test('CRUD operations: insert, select, and filter', async () => {
    const db = createLocalClient()

    // 1. Insert single
    const { data: member1, error: err1 } = await db
      .from('members')
      .insert({ name: 'Arun', phone: '+919999999991', gym_id: 'gym1' })

    assert.equal(err1, null)
    assert.ok(member1.id)
    assert.equal(member1.name, 'Arun')

    // 2. Insert batch
    const { data: members, error: err2 } = await db
      .from('members')
      .insert([
        { name: 'Bala', phone: '+919999999992', gym_id: 'gym1' },
        { name: 'Chitra', phone: '+919999999993', gym_id: 'gym2' },
      ])
    assert.equal(err2, null)
    assert.equal(members.length, 2)

    // 3. Select with eq filter
    const { data: gym1Members, error: err3 } = await db
      .from('members')
      .select('*')
      .eq('gym_id', 'gym1')

    assert.equal(err3, null)
    assert.equal(gym1Members.length, 2)
    assert.deepEqual(gym1Members.map((m: any) => m.name), ['Arun', 'Bala'])
  })

  test('Query filters: gt, gte, lt, lte, in, ilike', async () => {
    const db = createLocalClient()
    await db.from('members').insert([
      { name: 'M1', pending_amount: 0, area: 'T. Nagar' },
      { name: 'M2', pending_amount: 500, area: 'Anna Nagar' },
      { name: 'M3', pending_amount: 1500, area: 'Adyar' },
      { name: 'M4', pending_amount: 3000, area: 'Velachery' },
    ])

    // gt
    const { data: gt500 } = await db.from('members').select('*').gt('pending_amount', 500)
    assert.equal(gt500.length, 2)

    // gte
    const { data: gte500 } = await db.from('members').select('*').gte('pending_amount', 500)
    assert.equal(gte500.length, 3)

    // lt
    const { data: lt500 } = await db.from('members').select('*').lt('pending_amount', 500)
    assert.equal(lt500.length, 1)
    assert.equal(lt500[0].name, 'M1')

    // in
    const { data: inVals } = await db.from('members').select('*').in('pending_amount', [0, 3000])
    assert.equal(inVals.length, 2)

    // ilike
    const { data: nagarMembers } = await db.from('members').select('*').ilike('area', '%nagar%')
    assert.equal(nagarMembers.length, 2)
  })

  test('Ordering, limit, single, and maybeSingle', async () => {
    const db = createLocalClient()
    await db.from('members').insert([
      { name: 'B', member_number: 102 },
      { name: 'A', member_number: 101 },
      { name: 'C', member_number: 103 },
    ])

    // Order ascending
    const { data: asc } = await db.from('members').select('*').order('member_number', { ascending: true })
    assert.deepEqual(asc.map((m: any) => m.name), ['A', 'B', 'C'])

    // Order descending with limit
    const { data: descLimit } = await db.from('members').select('*').order('member_number', { ascending: false }).limit(2)
    assert.deepEqual(descLimit.map((m: any) => m.name), ['C', 'B'])

    // Single
    const { data: singleA } = await db.from('members').select('*').eq('name', 'A').single()
    assert.equal(singleA.name, 'A')

    // maybeSingle
    const { data: missing } = await db.from('members').select('*').eq('name', 'Z').maybeSingle()
    assert.equal(missing, null)
  })

  test('Update, upsert, and delete operations', async () => {
    const db = createLocalClient()
    const { data: member } = await db.from('members').insert({ name: 'Old Name', pending_amount: 100 })

    // Update
    const { data: updated } = await db
      .from('members')
      .update({ name: 'New Name', pending_amount: 0 })
      .eq('id', member.id)
      .single()

    assert.equal(updated.name, 'New Name')
    assert.equal(updated.pending_amount, 0)

    // Upsert
    const { data: upserted } = await db.from('members').upsert({ id: member.id, name: 'Upserted Name' })
    assert.equal(upserted.name, 'Upserted Name')

    // Delete
    await db.from('members').delete().eq('id', member.id)
    const { data: remaining } = await db.from('members').select('*').eq('id', member.id)
    assert.equal(remaining.length, 0)
  })

  test('Auth simulation: default user and login flow', async () => {
    const db = createLocalClient()

    // Default user is logged in
    const { data: u1 } = await db.auth.getUser()
    assert.ok(u1.user)
    assert.equal(u1.user?.email, 'owner@powerfit.com')

    // Sign out
    await db.auth.signOut()
    const { data: u2 } = await db.auth.getUser()
    assert.equal(u2.user, null)

    // Sign in with password
    const { data: signInRes } = await db.auth.signInWithPassword({ email: 'newtrainer@powerfit.com' })
    assert.equal(signInRes.user?.email, 'newtrainer@powerfit.com')

    const { data: u3 } = await db.auth.getUser()
    assert.equal(u3.user?.email, 'newtrainer@powerfit.com')
  })

  test('RPC Stored Procedures: get_gym_dashboard and sell_inventory_item', async () => {
    const db = createLocalClient()
    const gymId = 'test-gym-123'
    const today = '2026-09-04'

    // Add members and memberships
    const { data: m1 } = await db.from('members').insert({ gym_id: gymId, name: 'M1', pending_amount: 500 })
    const { data: m2 } = await db.from('members').insert({ gym_id: gymId, name: 'M2', pending_amount: 1000 })

    // m1 active
    await db.from('memberships').insert({
      gym_id: gymId,
      member_id: m1.id,
      start_date: today,
      end_date: '2026-09-24',
      amount: 2000,
      admission_fee: 500,
    })

    // m2 expiring in 2 days
    await db.from('memberships').insert({
      gym_id: gymId,
      member_id: m2.id,
      start_date: '2026-08-01',
      end_date: '2026-09-06',
      amount: 1500,
      admission_fee: 0,
    })

    // Attendance today
    await db.from('attendance').insert({
      gym_id: gymId,
      member_id: m1.id,
      date: today,
      session: 'morning',
    })

    const { data: dashboard, error } = await db.rpc('get_gym_dashboard', {
      p_gym_id: gymId,
      p_today: today,
    })

    assert.equal(error, null)
    assert.equal(dashboard.stats.today_attendance, 1)
    assert.equal(dashboard.stats.today_collection, 2500)
    assert.equal(dashboard.stats.total_dues, 1500)
    assert.equal(dashboard.stats.expiring_this_week, 1)
    assert.equal(dashboard.expiringMembers.length, 1)
    assert.equal(dashboard.expiringMembers[0].name, 'M2')

    // Test inventory sell RPC
    const { data: item } = await db.from('inventory').insert({
      gym_id: gymId,
      name: 'Whey Protein',
      quantity: 10,
      selling_price: 3000,
    })

    const { data: saleRes } = await db.rpc('sell_inventory_item', {
      p_gym_id: gymId,
      p_item_id: item.id,
      p_quantity: 2,
      p_selling_price: 3000,
    })

    assert.equal(saleRes.success, true)
    const { data: updatedItem } = await db.from('inventory').select('*').eq('id', item.id).single()
    assert.equal(updatedItem.quantity, 8)

    // Test production inventory sell RPC (p_inventory_id, initial_stock, inventory_sales)
    const { data: prodItem } = await db.from('inventory').insert({
      gym_id: gymId,
      product_name: 'Energy Booster',
      variant_name: '1 KG',
      selling_price: 900,
      initial_stock: 100,
    })

    const { data: prodSaleRes, error: prodSaleErr } = await db.rpc('sell_inventory_item', {
      p_inventory_id: prodItem.id,
      p_quantity: 2,
      p_unit_price: 900,
      p_payment_mode: 'cash',
    })

    assert.equal(prodSaleErr, null)
    assert.equal(prodSaleRes.product_name, 'Energy Booster')
    assert.equal(prodSaleRes.quantity, 2)
    assert.equal(prodSaleRes.total_price, 1800)
    assert.equal(prodSaleRes.remaining_stock, 98)

    const { data: updatedProdItem } = await db.from('inventory').select('*').eq('id', prodItem.id).single()
    assert.equal(updatedProdItem.initial_stock, 98)

    const { data: sales } = await db
      .from('inventory_sales')
      .select('*')
      .eq('inventory_id', prodItem.id)
    assert.equal(sales.length, 1)
    assert.equal(sales[0].total_price, 1800)
  })
})
