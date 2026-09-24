import type { LocalDBData } from './types'

function getInitialData(): LocalDBData {
  return {
    users: [],
    gyms: [],
    members: [],
    memberships: [],
    due_payments: [],
    attendance: [],
    inventory: [],
    support_tickets: [],
    admin_messages: [],
    whatsapp_automation_logs: [],
    whatsapp_send_queue: [],
  }
}

function getNodeFs() {
  if (typeof window === 'undefined') {
    try {
      const nodeFs = eval("require('fs')")
      const nodePath = eval("require('path')")
      const dbDir = nodePath.resolve(process.cwd(), '.local-db')
      const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test')
      const dbFile = nodePath.join(dbDir, isTest ? 'test-data.json' : 'data.json')
      return { fs: nodeFs, path: nodePath, dbDir, dbFile }
    } catch {
      return null
    }
  }
  return null
}

class LocalDBStore {
  private data: LocalDBData = getInitialData()
  private initialized = false
  private isBrowser = typeof window !== 'undefined'

  private lastMtime = 0
  private lastStatCheck = 0
  private saveTimeout: any = null

  constructor() {
    this.init()
  }

  private syncFromDisk() {
    if (this.isBrowser) return
    const now = Date.now()
    const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test')
    const throttleMs = isTest ? 10 : 1000
    if (now - this.lastStatCheck < throttleMs) return
    this.lastStatCheck = now
    try {
      const node = getNodeFs()
      if (node && node.fs.existsSync(node.dbFile)) {
        const stats = node.fs.statSync(node.dbFile)
        if (stats.mtimeMs > this.lastMtime) {
          const fileContent = node.fs.readFileSync(node.dbFile, 'utf-8')
          if (fileContent.trim()) {
            this.data = { ...getInitialData(), ...JSON.parse(fileContent) }
            this.lastMtime = stats.mtimeMs
          }
        }
      }
    } catch {
      // Silently continue
    }
  }

  private init() {
    if (this.initialized) return
    this.initialized = true

    if (this.isBrowser) {
      // In browser, try localStorage if available for quick paint
      try {
        const stored = window.localStorage?.getItem('gymflow_local_db')
        if (stored) {
          this.data = { ...getInitialData(), ...JSON.parse(stored) }
        }
      } catch {
        // Fallback to in-memory
      }
      // Always sync with the server to get authoritative state
      this.syncWithServer().catch(() => {})
      return
    }

    this.syncFromDisk()
  }

  public getTable<T = any>(tableName: string): T[] {
    this.syncFromDisk()
    if (!this.data[tableName]) {
      this.data[tableName] = []
    }
    return this.data[tableName] as T[]
  }

  public setTable<T = any>(tableName: string, rows: T[]) {
    this.data[tableName] = rows
    this.persist()
  }

  public setAll(newData: Partial<LocalDBData>) {
    this.syncFromDisk()
    if (!newData || typeof newData !== 'object') return

    const merged = { ...this.data }
    for (const [table, incomingRows] of Object.entries(newData)) {
      if (!Array.isArray(incomingRows)) continue
      const currentRows: any[] = (merged as any)[table] || []
      const map = new Map<string, any>()

      // Server rows are primary
      for (const row of currentRows) {
        const key = row?.id ? String(row.id) : JSON.stringify(row)
        map.set(key, row)
      }
      // Upsert incoming rows
      for (const row of incomingRows) {
        if (!row) continue
        const key = row?.id ? String(row.id) : JSON.stringify(row)
        const existing = map.get(key)
        if (existing) {
          map.set(key, { ...existing, ...row })
        } else {
          map.set(key, row)
        }
      }
      ;(merged as any)[table] = Array.from(map.values())
    }
    this.data = merged as LocalDBData
    this.persist()
  }

  private lastServerSync = 0
  private pushTimeout: any = null

  public async syncWithServer(): Promise<void> {
    if (!this.isBrowser) return
    const now = Date.now()
    if (now - this.lastServerSync < 1500) return
    try {
      const res = await fetch('/api/local-db', { cache: 'no-store' })
      if (res.ok) {
        const serverData = await res.json()
        if (serverData && typeof serverData === 'object') {
          // Merge server data into client
          for (const [table, rows] of Object.entries(serverData)) {
            if (Array.isArray(rows)) {
              ;(this.data as any)[table] = rows
            }
          }
          this.lastServerSync = now
          window.localStorage?.setItem('gymflow_local_db', JSON.stringify(this.data))
        }
      }
    } catch {
      // Silently fail if offline
    }
  }

  public async pushToServer(): Promise<void> {
    if (!this.isBrowser) return
    if (this.pushTimeout) clearTimeout(this.pushTimeout)
    this.pushTimeout = setTimeout(async () => {
      try {
        await fetch('/api/local-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data),
          keepalive: true,
        })
        this.lastServerSync = Date.now()
      } catch {
        // Silently fail if offline
      }
    }, 600)
  }

  public persist() {
    if (this.isBrowser) {
      try {
        window.localStorage?.setItem('gymflow_local_db', JSON.stringify(this.data))
        this.pushToServer().catch(() => {})
      } catch {
        // Ignore browser storage limits
      }
      return
    }

    try {
      const node = getNodeFs()
      if (node) {
        if (!node.fs.existsSync(node.dbDir)) {
          node.fs.mkdirSync(node.dbDir, { recursive: true })
        }
        const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test')
        if (isTest) {
          node.fs.writeFileSync(node.dbFile, JSON.stringify(this.data), 'utf-8')
          const stats = node.fs.statSync(node.dbFile)
          this.lastMtime = stats.mtimeMs
          return
        }

        // In dev / server: debounce disk writes to prevent event-loop freeze
        if (this.saveTimeout) clearTimeout(this.saveTimeout)
        this.saveTimeout = setTimeout(() => {
          try {
            const content = JSON.stringify(this.data)
            node.fs.writeFile(node.dbFile, content, 'utf-8', (err: any) => {
              if (!err) {
                node.fs.stat(node.dbFile, (statErr: any, stats: any) => {
                  if (!statErr && stats) {
                    this.lastMtime = stats.mtimeMs
                  }
                })
              }
            })
          } catch {
            // Silently fail if file system is read-only
          }
        }, 150)
      }
    } catch {
      // Silently fail if file system is read-only
    }
  }

  public reset(initialData?: Partial<LocalDBData>) {
    const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test')
    if (!isTest) {
      console.warn('⚠️ store.reset() was called outside of test mode - prevented wiping data.json!')
      return
    }
    this.data = Object.assign(getInitialData(), initialData || {}) as LocalDBData
    this.persist()
  }

  public dump(): LocalDBData {
    this.syncFromDisk()
    return JSON.parse(JSON.stringify(this.data))
  }
}

// Global singleton instance so all server invocations in dev share the same store
const globalForStore = globalThis as unknown as { localDBStore?: LocalDBStore }
export const store = globalForStore.localDBStore || new LocalDBStore()
if (process.env.NODE_ENV !== 'production') {
  globalForStore.localDBStore = store
}
