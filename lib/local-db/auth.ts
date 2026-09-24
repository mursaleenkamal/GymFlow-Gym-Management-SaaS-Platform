import { store } from './store'
import type { LocalUser } from './types'
import { MOCK_SESSION_COOKIE, parseMockSessionCookie } from '../supabase/config'

export const DEFAULT_MOCK_USER: LocalUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'owner@powerfit.com',
  role: 'authenticated',
  app_metadata: {
    provider: 'email',
  },
  user_metadata: {
    name: 'Ahmed Raza',
    gym_name: 'PowerFit Gym Lahore',
  },
  created_at: '2026-09-05T21:21:59.212Z',
  password: 'Password123!',
}

export const DEFAULT_MOCK_ADMIN: LocalUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@gymflow.sbs',
  role: 'super_admin',
  app_metadata: {
    provider: 'email',
  },
  user_metadata: {
    name: 'GymFlow SuperAdmin',
  },
  created_at: '2026-09-05T21:21:59.212Z',
  password: 'Password123!',
}

export class LocalAuthAdmin {
  async createUser(params: {
    email: string
    password?: string
    email_confirm?: boolean
    user_metadata?: Record<string, any>
    app_metadata?: Record<string, any>
  }): Promise<{ data: { user: LocalUser | null }; error: any }> {
    const trimmedEmail = params.email.trim().toLowerCase()
    const users = store.getTable<LocalUser>('users')
    const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail)

    if (existing) {
      return {
        data: { user: null },
        error: { message: 'User already exists' },
      }
    }

    const newUser: LocalUser = {
      id: crypto.randomUUID(),
      email: trimmedEmail,
      password: params.password || 'Password123!',
      role: 'authenticated',
      email_confirmed_at: params.email_confirm ? new Date().toISOString() : undefined,
      user_metadata: params.user_metadata || {},
      app_metadata: params.app_metadata || { provider: 'email' },
      created_at: new Date().toISOString(),
    }

    store.setTable('users', [...users, newUser])
    return { data: { user: newUser }, error: null }
  }

  async deleteUser(id: string): Promise<{ data: any; error: any }> {
    const users = store.getTable<LocalUser>('users')
    const remaining = users.filter((u) => u.id !== id)
    store.setTable('users', remaining)
    return { data: {}, error: null }
  }

  async getUserById(id: string): Promise<{ data: { user: LocalUser | null }; error: any }> {
    const users = store.getTable<LocalUser>('users')
    const user = users.find((u) => u.id === id) || null
    return {
      data: { user },
      error: user ? null : { message: 'User not found' },
    }
  }

  async updateUserById(
    id: string,
    updates: {
      password?: string
      ban_duration?: string
      user_metadata?: Record<string, any>
      email?: string
      app_metadata?: Record<string, any>
    }
  ): Promise<{ data: { user: LocalUser | null }; error: any }> {
    const users = store.getTable<LocalUser>('users')
    const idx = users.findIndex((u) => u.id === id)
    if (idx === -1) {
      return { data: { user: null }, error: { message: 'User not found' } }
    }

    const updated = { ...users[idx] }
    if (updates.password !== undefined) updated.password = updates.password
    if (updates.email !== undefined) updated.email = updates.email
    if (updates.user_metadata !== undefined) {
      updated.user_metadata = { ...updated.user_metadata, ...updates.user_metadata }
    }
    if (updates.app_metadata !== undefined) {
      updated.app_metadata = { ...updated.app_metadata, ...updates.app_metadata }
    }

    users[idx] = updated
    store.setTable('users', [...users])
    return { data: { user: updated }, error: null }
  }

  async listUsers(_params?: {
    page?: number
    perPage?: number
  }): Promise<{ data: { users: LocalUser[] }; error: any }> {
    const users = store.getTable<LocalUser>('users')
    return { data: { users }, error: null }
  }

  async generateLink(params: {
    type: string
    email: string
    options?: any
  }): Promise<{ data: { properties: { action_link: string } }; error: any }> {
    return {
      data: {
        properties: {
          action_link: `http://localhost:3004/auth/setup-password#access_token=mock-token&type=${params.type}`,
        },
      },
      error: null,
    }
  }
}

export class LocalAuth {
  private currentUser: LocalUser | null = null
  private listeners: Array<(event: string, session: any) => void> = []
  public admin = new LocalAuthAdmin()

  constructor(initialUser?: LocalUser | null) {
    if (initialUser !== undefined) {
      this.currentUser = initialUser
      return
    }

    if (typeof window !== 'undefined') {
      try {
        if (typeof document !== 'undefined' && document.cookie) {
          const match = document.cookie.match(
            new RegExp('(?:^|; )' + MOCK_SESSION_COOKIE + '=([^;]*)')
          )
          if (match) {
            const parsed = parseMockSessionCookie(match[1])
            if (parsed) {
              const users = store.getTable<LocalUser>('users')
              const found = users.find(
                (u) =>
                  u.id === parsed.userId ||
                  u.email?.toLowerCase() === parsed.email?.toLowerCase()
              )
              if (found) {
                this.currentUser = found
                return
              }
              this.currentUser = {
                id: parsed.userId,
                email: parsed.email || '',
                role: 'authenticated',
                user_metadata: { name: parsed.name },
                created_at: new Date().toISOString(),
              }
              return
            }
          }
        }
        const stored = window.localStorage?.getItem('gymflow_mock_auth_user')
        if (stored) {
          this.currentUser = JSON.parse(stored)
          return
        }
      } catch {
        // Fallback
      }
    }

    const users = store.getTable<LocalUser>('users')
    this.currentUser =
      users.find((u) => u.email === DEFAULT_MOCK_USER.email) || DEFAULT_MOCK_USER
  }

  private notifyListeners(event: string, user: LocalUser | null) {
    const session = user
      ? {
          access_token: 'mock-token-' + user.id,
          token_type: 'bearer',
          user,
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
        }
      : null
    this.listeners.forEach((cb) => {
      try {
        cb(event, session)
      } catch {
        // Ignore subscriber error
      }
    })
  }

  private persistBrowserSession(user: LocalUser) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage?.setItem('gymflow_mock_auth_user', JSON.stringify(user))
    } catch {
      // Ignore storage error
    }
  }

  private clearBrowserSession() {
    if (typeof window === 'undefined') return
    try {
      window.localStorage?.removeItem('gymflow_mock_auth_user')
    } catch {
      // Ignore storage error
    }
  }

  async getUser(): Promise<{ data: { user: LocalUser | null }; error: any }> {
    return { data: { user: this.currentUser }, error: null }
  }

  async getSession(): Promise<{ data: { session: any | null }; error: any }> {
    if (!this.currentUser) {
      return { data: { session: null }, error: null }
    }
    return {
      data: {
        session: {
          access_token: 'mock-token-' + this.currentUser.id,
          token_type: 'bearer',
          user: this.currentUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 7,
        },
      },
      error: null,
    }
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string
    password?: string
  }): Promise<{ data: { user: LocalUser | null; session: any | null }; error: any }> {
    let normalizedEmail = email.toLowerCase().trim()
    if (normalizedEmail === 'admin' || normalizedEmail === 'superadmin' || normalizedEmail === 'admin@gymflow.com') {
      normalizedEmail = (process.env.ADMIN_EMAIL || 'admin@gymflow.sbs').toLowerCase().trim()
    } else if (normalizedEmail === 'owner' || normalizedEmail === 'owner@gymflow.com' || normalizedEmail === 'owner@gymflow.test') {
      normalizedEmail = 'owner@powerfit.com'
    }

    const users = store.getTable<LocalUser>('users')
    let user = users.find((u) => u.email.toLowerCase() === normalizedEmail)

    // Ensure mock admin and mock owner are always available
    if (!user) {
      if (normalizedEmail === (process.env.ADMIN_EMAIL || 'admin@gymflow.sbs').toLowerCase().trim()) {
        user = DEFAULT_MOCK_ADMIN
        store.setTable('users', [...users, user])
      } else if (normalizedEmail === DEFAULT_MOCK_USER.email.toLowerCase()) {
        user = DEFAULT_MOCK_USER
        store.setTable('users', [...users, user])
      } else if (!password) {
        user = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          role: 'authenticated',
          user_metadata: {},
          created_at: new Date().toISOString(),
        }
        store.setTable('users', [...users, user])
      } else {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid email or password' },
        }
      }
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gymflow.sbs').toLowerCase().trim()
    const isMockAdmin = user.email.toLowerCase() === adminEmail || user.role === 'super_admin'
    const isMockOwner = user.email.toLowerCase() === DEFAULT_MOCK_USER.email.toLowerCase()

    if (password) {
      if (isMockAdmin) {
        const allowedAdminPw = [
          'Password123!',
          process.env.ADMIN_PASSWORD,
          user.password,
        ].filter(Boolean) as string[]
        if (!allowedAdminPw.includes(password)) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid email or password' },
          }
        }
      } else if (isMockOwner) {
        const allowedOwnerPw = ['Password123!', user.password].filter(Boolean) as string[]
        if (!allowedOwnerPw.includes(password)) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid email or password' },
          }
        }
      } else if (user.password && user.password !== password) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid email or password' },
        }
      }
    }

    this.currentUser = user
    this.persistBrowserSession(user)
    this.notifyListeners('SIGNED_IN', user)

    return {
      data: {
        user,
        session: {
          access_token: 'mock-token-' + user.id,
          token_type: 'bearer',
          user,
        },
      },
      error: null,
    }
  }

  async signUp({
    email,
    password,
    options,
  }: {
    email: string
    password?: string
    options?: { data?: Record<string, any>; emailRedirectTo?: string }
  }): Promise<{ data: { user: LocalUser | null; session: any | null }; error: any }> {
    const normalizedEmail = email.toLowerCase().trim()
    const users = store.getTable<LocalUser>('users')
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail)

    if (existing) {
      return {
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      }
    }

    const newUser: LocalUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      password: password || 'Password123!',
      role: 'authenticated',
      user_metadata: options?.data || {},
      created_at: new Date().toISOString(),
    }

    store.setTable('users', [...users, newUser])
    this.currentUser = newUser
    this.persistBrowserSession(newUser)
    this.notifyListeners('SIGNED_IN', newUser)

    return {
      data: {
        user: newUser,
        session: {
          access_token: 'mock-token-' + newUser.id,
          token_type: 'bearer',
          user: newUser,
        },
      },
      error: null,
    }
  }

  async signOut(): Promise<{ error: any }> {
    this.currentUser = null
    this.clearBrowserSession()
    this.notifyListeners('SIGNED_OUT', null)
    return { error: null }
  }

  async updateUser(attributes: {
    password?: string
    data?: Record<string, any>
  }): Promise<{ data: { user: LocalUser | null }; error: any }> {
    if (!this.currentUser) {
      return { data: { user: null }, error: { message: 'Not authenticated' } }
    }
    const users = store.getTable<LocalUser>('users')
    const idx = users.findIndex((u) => u.id === this.currentUser!.id)
    if (idx !== -1) {
      const updated = { ...users[idx] }
      if (attributes.password !== undefined) updated.password = attributes.password
      if (attributes.data !== undefined) {
        updated.user_metadata = { ...updated.user_metadata, ...attributes.data }
      }
      users[idx] = updated
      store.setTable('users', [...users])
      this.currentUser = updated
      this.persistBrowserSession(updated)
    }
    return { data: { user: this.currentUser }, error: null }
  }

  async resetPasswordForEmail(_email: string, _options?: any): Promise<{ data: any; error: any }> {
    return { data: {}, error: null }
  }

  async resend(_params: any): Promise<{ data: any; error: any }> {
    return { data: {}, error: null }
  }

  onAuthStateChange(
    callback: (event: string, session: any) => void
  ): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.push(callback)
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((cb) => cb !== callback)
          },
        },
      },
    }
  }
}