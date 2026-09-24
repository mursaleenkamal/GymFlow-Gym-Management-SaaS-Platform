import { store } from './store'
import type { LocalAttendance, LocalMember, LocalMembership, LocalInventoryItem } from './types'



export async function executeRPC(functionName: string, params: Record<string, any> = {}): Promise<{ data: any; error: any }> {
  switch (functionName) {
    case 'get_gym_dashboard': {
      const gymId = params.p_gym_id
      const today = params.p_today || new Date().toISOString().split('T')[0]

      const members = store.getTable<LocalMember>('members').filter((m) => m.gym_id === gymId)
      const memberships = store.getTable<LocalMembership>('memberships').filter((ms) => ms.gym_id === gymId)
      const attendances = store.getTable<LocalAttendance>('attendance').filter((a) => a.gym_id === gymId)

      // 1. Attendance today
      const todayAttendance = attendances.filter((a) => a.date === today).length

      // 2. Today's collection
      const todayCollection = memberships
        .filter((ms) => ms.start_date === today)
        .reduce((sum, ms) => sum + (ms.amount || 0) + (ms.admission_fee || 0), 0)

      // 3. Total dues
      const totalDues = members
        .filter((m) => m.pending_amount > 0)
        .reduce((sum, m) => sum + (m.pending_amount || 0), 0)

      // 4. Member Statuses & Expiring
      const now = new Date(today)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      let totalActive = 0
      let expiringThisWeek = 0
      let expiredCount = 0
      const expiringMembers: any[] = []

      for (const m of members) {
        // Find latest membership
        const memberPlans = memberships
          .filter((ms) => ms.member_id === m.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latest = memberPlans[0]

        if (!latest || !latest.end_date) {
          expiredCount++
          continue
        }

        const endDate = new Date(latest.end_date)
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (endDate < now) {
          expiredCount++
        } else if (endDate <= sevenDaysFromNow) {
          totalActive++
          expiringThisWeek++
          expiringMembers.push({
            id: m.id,
            name: m.name,
            phone: m.phone,
            member_number: m.member_number,
            status: 'expiring',
            days_remaining: daysRemaining,
            latest_membership: { end_date: latest.end_date },
          })
        } else {
          totalActive++
        }
      }

      expiringMembers.sort((a, b) => a.days_remaining - b.days_remaining)

      return {
        data: {
          stats: {
            total_active: totalActive,
            expiring_this_week: expiringThisWeek,
            expired_count: expiredCount,
            today_attendance: todayAttendance,
            today_collection: todayCollection,
            total_dues: totalDues,
          },
          expiringMembers,
        },
        error: null,
      }
    }

    case 'check_gym_active': {
      const gymId = params.p_gym_id || params.gym_id
      const gyms = store.getTable('gyms')
      const gym = gyms.find((g) => g.id === gymId)
      return { data: gym ? gym.is_active : true, error: null }
    }

    case 'sell_inventory_item': {
      const itemId = params.p_inventory_id || params.p_item_id
      const gymId = params.p_gym_id
      const quantity = Number(params.p_quantity)
      if (!quantity || quantity < 1) {
        return { data: null, error: { message: 'INVALID_QUANTITY' } }
      }

      const inventory = store.getTable<LocalInventoryItem>('inventory')
      const item = inventory.find((i) => i.id === itemId && (!gymId || i.gym_id === gymId))
      if (!item) {
        return { data: null, error: { message: 'PRODUCT_NOT_FOUND' } }
      }

      const currentStock = item.initial_stock !== undefined ? Number(item.initial_stock) : Number(item.quantity ?? 0)
      if (currentStock < quantity) {
        return { data: null, error: { message: `INSUFFICIENT_STOCK:${currentStock}` } }
      }

      const unitPrice =
        params.p_unit_price !== undefined && params.p_unit_price !== null
          ? Number(params.p_unit_price)
          : params.p_selling_price !== undefined && params.p_selling_price !== null
          ? Number(params.p_selling_price)
          : Number(item.selling_price ?? 0)

      const totalPrice = unitPrice * quantity
      const paymentMode = ['cash', 'upi', 'card'].includes(params.p_payment_mode) ? params.p_payment_mode : 'cash'
      const remainingStock = Math.max(0, currentStock - quantity)

      if (item.initial_stock !== undefined) {
        item.initial_stock = remainingStock
      }
      if (item.quantity !== undefined || item.initial_stock === undefined) {
        item.quantity = remainingStock
      }
      item.updated_at = new Date().toISOString()
      store.setTable('inventory', inventory)

      // Record sale in inventory_sales table
      const sales = store.getTable('inventory_sales')
      const saleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sale_${Date.now()}`
      const now = new Date().toISOString()
      const sale = {
        id: saleId,
        gym_id: item.gym_id,
        inventory_id: item.id,
        item_id: item.id,
        product_name: item.product_name || item.name || '',
        variant_name: item.variant_name || '',
        quantity,
        unit_price: unitPrice,
        selling_price: unitPrice,
        total_price: totalPrice,
        payment_mode: paymentMode,
        sold_at: now,
        created_at: now,
      }
      sales.push(sale)
      store.setTable('inventory_sales', sales)

      return {
        data: {
          success: true,
          sale_id: saleId,
          product_name: sale.product_name,
          variant_name: sale.variant_name,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          remaining_stock: remainingStock,
          item,
          sale,
        },
        error: null,
      }
    }

    case 'increment_inventory_stock': {
      const itemId = params.p_inventory_id || params.p_item_id
      const amount = Number(params.amount || 1)
      const inventory = store.getTable<LocalInventoryItem>('inventory')
      const item = inventory.find((i) => i.id === itemId)
      if (!item) {
        return { data: null, error: { message: 'Inventory item not found' } }
      }
      if (item.initial_stock !== undefined) {
        item.initial_stock = (Number(item.initial_stock) || 0) + amount
      }
      if (item.quantity !== undefined || item.initial_stock === undefined) {
        item.quantity = (Number(item.quantity) || 0) + amount
      }
      item.updated_at = new Date().toISOString()
      store.setTable('inventory', inventory)
      return { data: item, error: null }
    }

    case 'log_subscription_action': {
      const logs = store.getTable('subscription_audit_logs')
      const log = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
        ...params,
        created_at: new Date().toISOString(),
      }
      logs.push(log)
      store.setTable('subscription_audit_logs', logs)
      return { data: { success: true }, error: null }
    }

    default:
      return { data: null, error: null }
  }
}
