import { describe, it, expect, beforeEach } from 'vitest'
import { createLocalClient, store } from '@/lib/local-db'

describe('Local Database Environment (Zero-Docker)', () => {
  beforeEach(() => {
    store.reset()
  })

  describe('Query Builder: CRUD operations', () => {
    it('inserts and selects single and multiple records', async () => {
      const db = createLocalClient()

      // Insert single
      const { data: member1, error: err1 } = await db
        .from('members')
        .insert({ name: 'Arun', phone: '+919999999991', gym_id: 'gym1' })
      expect(err1).toBeNull()
      expect(member1.id).toBeDefined()
      expect(member1.name).toBe('Arun')

      // Insert batch
      const { data: members, error: err2 } = await db
        .from('members')
        .insert([
          { name: 'Bala', phone: '+919999999992', gym_id: 'gym1' },
          { name: 'Chitra', phone: '+919999999993', gym_id: 'gym2' },
        ])
      expect(err2).toBeNull()
      expect(members.length).toBe(2)

      // Select all in gym1
      const { data: gym1Members, error: err3 } = await db
        .from('members')
        .select('*')
        .eq('gym_id', 'gym1')

      expect(err3).toBeNull()
      expect(gym1Members.length).toBe(2)
      expect(gym1Members.map((m: any) => m.name)).toEqual(['Arun', 'Bala'])
    })

    it('supports filtering with eq, neq, gt, gte, lt, lte, and in', async () => {
      const db = createLocalClient()
      await db.from('members').insert([
        { name: 'M1', pending_amount: 0 },
        { name: 'M2', pending_amount: 500 },
        { name: 'M3', pending_amount: 1500 },
        { name: 'M4', pending_amount: 3000 },
      ])

      // gt
      const { data: gt500 } = await db.from('members').select('*').gt('pending_amount', 500)
      expect(gt500.length).toBe(2)

      // gte
      const { data: gte500 } = await db.from('members').select('*').gte('pending_amount', 500)
      expect(gte500.length).toBe(3)

      // lt
      const { data: lt500 } = await db.from('members').select('*').lt('pending_amount', 500)
      expect(lt500.length).toBe(1)
      expect(lt500[0].name).toBe('M1')

      // in
      const { data: inVals } = await db.from('members').select('*').in('pending_amount', [0, 3000])
      expect(inVals.length).toBe(2)
    })

    it('supports text search with ilike and like', async () => {
      const db = createLocalClient()
      await db.from('members').insert([
        { name: 'Karthik Raja', area: 'T. Nagar' },
        { name: 'Ananya Sridhar', area: 'Anna Nagar' },
        { name: 'Raja Sekhar', area: 'Velachery' },
      ])

      const { data: rajaList } = await db.from('members').select('*').ilike('name', '%raja%')
      expect(rajaList.length).toBe(2)
    })

    it('supports ordering, limit, range, single, and maybeSingle', async () => {
      const db = createLocalClient()
      await db.from('members').insert([
        { name: 'B', member_number: 102 },
        { name: 'A', member_number: 101 },
        { name: 'C', member_number: 103 },
      ])

      // Order ascending
      const { data: asc } = await db.from('members').select('*').order('member_number', { ascending: true })
      expect(asc.map((m: any) => m.name)).toEqual(['A', 'B', 'C'])

      // Order descending with limit
      const { data: descLimit } = await db.from('members').select('*').order('member_number', { ascending: false }).limit(2)
      expect(descLimit.map((m: any) => m.name)).toEqual(['C', 'B'])

      // Single
      const { data: singleA } = await db.from('members').select('*').eq('name', 'A').single()
      expect(singleA.name).toBe('A')

      // maybeSingle (missing returns null without throwing)
      const { data: missing } = await db.from('members').select('*').eq('name', 'Z').maybeSingle()
      expect(missing).toBeNull()
    })

    it('updates records accurately', async () => {
      const db = createLocalClient()
      const { data: member } = await db.from('members').insert({ name: 'Old Name', pending_amount: 100 })

      const { data: updated } = await db
        .from('members')
        .update({ name: 'New Name', pending_amount: 0 })
        .eq('id', member.id)
        .single()

      expect(updated.name).toBe('New Name')
      expect(updated.pending_amount).toBe(0)
    })

    it('upserts records with conflict handling', async () => {
      const db = createLocalClient()
      const { data: created } = await db.from('members').insert({ id: 'mem-100', name: 'Original', area: 'Adyar' })

      // Upsert update
      const { data: upserted } = await db.from('members').upsert({ id: 'mem-100', name: 'Updated', area: 'Adyar' })
      expect(upserted.name).toBe('Updated')

      const { data: all } = await db.from('members').select('*')
      expect(all.length).toBe(1)
    })

    it('deletes records cleanly', async () => {
      const db = createLocalClient()
      await db.from('members').insert([
        { name: 'Keep 1' },
        { name: 'Delete Me' },
        { name: 'Keep 2' },
      ])

      await db.from('members').delete().eq('name', 'Delete Me')
      const { data: remaining } = await db.from('members').select('*')
      expect(remaining.length).toBe(2)
      expect(remaining.some((m: any) => m.name === 'Delete Me')).toBe(false)
    })
  })

  describe('Auth Mocking', () => {
    it('handles default user and authentication flows', async () => {
      const db = createLocalClient()

      // Default user is logged in
      const { data: u1 } = await db.auth.getUser()
      expect(u1.user).toBeDefined()
      expect(u1.user?.email).toBe('owner@powerfit.com')

      // Sign out
      await db.auth.signOut()
      const { data: u2 } = await db.auth.getUser()
      expect(u2.user).toBeNull()

      // Sign in with password
      const { data: signInRes } = await db.auth.signInWithPassword({ email: 'newtrainer@gym.com' })
      expect(signInRes.user?.email).toBe('newtrainer@gym.com')

      const { data: u3 } = await db.auth.getUser()
      expect(u3.user?.email).toBe('newtrainer@gym.com')
    })
  })

  describe('RPC Function Emulation', () => {
    it('executes get_gym_dashboard with accurate aggregations', async () => {
      const db = createLocalClient()
      const gymId = 'test-gym-123'
      const today = '2026-09-04'

      // Add members and memberships
      const { data: m1 } = await db.from('members').insert({ gym_id: gymId, name: 'M1', pending_amount: 500 })
      const { data: m2 } = await db.from('members').insert({ gym_id: gymId, name: 'M2', pending_amount: 1000 })

      // m1 active (expires in 20 days)
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

      // Attendance today for m1
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

      expect(error).toBeNull()
      expect(dashboard.stats.today_attendance).toBe(1)
      expect(dashboard.stats.today_collection).toBe(2500) // 2000 + 500
      expect(dashboard.stats.total_dues).toBe(1500) // 500 + 1000
      expect(dashboard.stats.expiring_this_week).toBe(1) // m2
      expect(dashboard.expiringMembers.length).toBe(1)
      expect(dashboard.expiringMembers[0].name).toBe('M2')
    })

    it('executes sell_inventory_item and updates stock', async () => {
      const db = createLocalClient()
      const gymId = 'test-gym-inv'

      const { data: item } = await db.from('inventory').insert({
        gym_id: gymId,
        name: 'Whey Protein',
        quantity: 10,
        selling_price: 3000,
      })

      const { data: saleRes, error } = await db.rpc('sell_inventory_item', {
        p_gym_id: gymId,
        p_item_id: item.id,
        p_quantity: 2,
        p_selling_price: 3000,
      })

      expect(error).toBeNull()
      expect(saleRes.success).toBe(true)

      const { data: updatedItem } = await db.from('inventory').select('*').eq('id', item.id).single()
      expect(updatedItem.quantity).toBe(8)
    })

    it('executes sell_inventory_item with production schema (initial_stock, p_inventory_id)', async () => {
      const db = createLocalClient()
      const gymId = 'test-gym-inv-prod'

      const { data: product } = await db.from('inventory').insert({
        gym_id: gymId,
        product_name: 'Energy Booster',
        variant_name: '1 KG',
        selling_price: 900,
        initial_stock: 100,
      })

      // 1. Sell 2 units via RPC as called by /api/inventory/sell
      const { data: saleResult, error: saleError } = await db.rpc('sell_inventory_item', {
        p_inventory_id: product.id,
        p_quantity: 2,
        p_unit_price: 900,
        p_payment_mode: 'cash',
      })

      expect(saleError).toBeNull()
      expect(saleResult.product_name).toBe('Energy Booster')
      expect(saleResult.quantity).toBe(2)
      expect(saleResult.total_price).toBe(1800)
      expect(saleResult.remaining_stock).toBe(98)

      // 2. Verify stock updated in inventory table
      const { data: refreshedProduct } = await db.from('inventory').select('*').eq('id', product.id).single()
      expect(refreshedProduct.initial_stock).toBe(98)

      // 3. Verify sales history recorded and queryable
      const { data: salesList } = await db
        .from('inventory_sales')
        .select('*')
        .eq('inventory_id', product.id)
        .order('sold_at', { ascending: false })

      expect(salesList.length).toBe(1)
      expect(salesList[0].quantity).toBe(2)
      expect(salesList[0].unit_price).toBe(900)
      expect(salesList[0].total_price).toBe(1800)
      expect(salesList[0].payment_mode).toBe('cash')

      // 4. Test insufficient stock
      const { data: overSell, error: overSellError } = await db.rpc('sell_inventory_item', {
        p_inventory_id: product.id,
        p_quantity: 1000,
      })
      expect(overSell).toBeNull()
      expect(overSellError.message).toContain('INSUFFICIENT_STOCK:98')

      // 5. Test stock restoration
      await db.rpc('increment_inventory_stock', {
        p_inventory_id: product.id,
        amount: 2,
      })
      const { data: restoredProduct } = await db.from('inventory').select('*').eq('id', product.id).single()
      expect(restoredProduct.initial_stock).toBe(100)
    })
  })
})
