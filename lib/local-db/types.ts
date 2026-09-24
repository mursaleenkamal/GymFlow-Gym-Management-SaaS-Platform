export interface LocalUser {
  id: string
  email: string
  role?: string
  password?: string
  email_confirmed_at?: string
  app_metadata?: Record<string, any>
  user_metadata?: Record<string, any>
  created_at: string
}

export interface LocalGym {
  id: string
  name: string
  owner_id: string
  is_active: boolean
  onboarding_completed?: boolean
  subscription_status?: string
  phone?: string
  created_at: string
}

export interface LocalMember {
  id: string
  gym_id: string
  member_number: number
  name: string
  phone: string
  gender?: 'male' | 'female' | 'other'
  area?: string
  pending_amount: number
  is_imported?: boolean
  created_at: string
}

export interface LocalMembership {
  id: string
  member_id: string
  gym_id: string
  plan: 'monthly' | 'quarterly' | 'annual'
  category: 'strength' | 'cardio' | 'both'
  start_date: string
  end_date: string
  amount: number
  admission_fee: number
  due_amount: number
  payment_mode: 'cash' | 'upi' | 'card'
  created_at: string
}

export interface LocalDuePayment {
  id: string
  gym_id: string
  member_id: string
  amount: number
  payment_mode: 'cash' | 'upi' | 'card'
  created_at: string
}

export interface LocalAttendance {
  id: string
  member_id: string
  gym_id: string
  date: string
  session: 'morning' | 'evening'
  created_at: string
  check_out_time?: string | null
}

export interface LocalInventoryItem {
  id: string
  gym_id: string
  name?: string
  product_name?: string
  variant_name?: string
  brand?: string | null
  category?: string | null
  quantity?: number
  initial_stock?: number
  unit_price?: number
  cost_price?: number
  selling_price: number
  member_price?: number | null
  min_stock_alert?: number | null
  low_stock_threshold?: number | null
  sku?: string | null
  description?: string | null
  created_at: string
  updated_at?: string
  [key: string]: any
}

export interface LocalInventorySale {
  id: string
  gym_id: string
  inventory_id: string
  item_id?: string
  product_name: string
  variant_name: string
  quantity: number
  unit_price: number
  selling_price?: number
  total_price: number
  payment_mode: 'cash' | 'upi' | 'card' | string
  sold_at: string
  created_at: string
  [key: string]: any
}

export interface LocalSupportTicket {
  id: string
  gym_id: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

export interface LocalAdminMessage {
  id: string
  gym_id: string
  subject: string
  body: string
  sent_by: string
  type: 'info' | 'warning' | 'error' | 'success'
  read_at?: string | null
  created_at: string
  is_cleared_by_owner?: boolean
  is_cleared_by_admin?: boolean
}

export interface LocalDBData {
  users: LocalUser[]
  gyms: LocalGym[]
  members: LocalMember[]
  memberships: LocalMembership[]
  due_payments: LocalDuePayment[]
  attendance: LocalAttendance[]
  inventory: LocalInventoryItem[]
  support_tickets: LocalSupportTicket[]
  admin_messages: LocalAdminMessage[]
  whatsapp_automation_logs: any[]
  whatsapp_send_queue: any[]
  [key: string]: any[]
}
