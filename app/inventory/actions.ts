'use server'

import { redis } from '@/lib/redis'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  // getSession() is JWT-local (no network). Deleting a cache key only forces an
  // RLS-protected re-fetch, so a login check is enough — the previous getUser()
  // network call + gyms ownership SELECT added round trips for no security gain.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Unauthorized')
}

export async function invalidateInventoryCache(gymId: string) {
  await requireAuth()
  await redis.del(`inventory:${gymId}`)
}

export async function invalidateInventoryItemCache(gymId: string, itemId: string) {
  await requireAuth()
  // Wipe the individual item, its sales, and the global list cache in parallel.
  await Promise.all([
    redis.del(`inventory-item:${itemId}`),
    redis.del(`inventory-sales:${itemId}`),
    redis.del(`inventory:${gymId}`),
  ])
}

export interface CreateProductInput {
  productName: string
  brand?: string
  category?: string
  description?: string
  variants: {
    variantName: string
    sku?: string
    costPrice: number
    sellingPrice: number
    memberPrice?: number
    initialStock: number
    lowStockThreshold?: number
  }[]
}

export async function createInventoryProductAction(input: CreateProductInput) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Unauthorized')

    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('owner_id', session.user.id)
      .single()

    if (!gym) throw new Error('Gym not found')

    const rowsToInsert = input.variants.map((v) => ({
      gym_id: gym.id,
      product_name: input.productName,
      brand: input.brand || null,
      category: input.category || null,
      description: input.description || null,
      variant_name: v.variantName,
      sku: v.sku || null,
      cost_price: v.costPrice,
      selling_price: v.sellingPrice,
      member_price: v.memberPrice ?? null,
      initial_stock: v.initialStock,
      low_stock_threshold: v.lowStockThreshold ?? null,
    }))

    const { error } = await supabase.from('inventory').insert(rowsToInsert)
    if (error) throw error

    // Background cache invalidation
    invalidateInventoryCache(gym.id).catch(() => {})

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product' }
  }
}
