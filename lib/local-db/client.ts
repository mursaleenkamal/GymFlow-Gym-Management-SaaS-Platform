import { LocalQueryBuilder } from './query-builder'
import { LocalAuth } from './auth'
import { executeRPC } from './rpc'


import type { LocalUser } from './types'

export class LocalSupabaseClient {
  public auth: LocalAuth

  constructor(initialUser?: LocalUser | null) {
    this.auth = new LocalAuth(initialUser)
  }

  from(tableName: string) {
    return new LocalQueryBuilder(tableName)
  }

  rpc(functionName: string, params: Record<string, any> = {}) {
    return executeRPC(functionName, params)
  }

  channel(_channelName: string) {
    const channelObj = {
      on: () => channelObj,
      subscribe: (cb?: (status: string) => void) => {
        if (cb) setTimeout(() => cb('SUBSCRIBED'), 10)
        return channelObj
      },
      unsubscribe: () => 'unsubscribed',
      send: () => Promise.resolve({ error: null }),
    }
    return channelObj
  }

  removeChannel(_channel: any) {
    return Promise.resolve('ok')
  }

  get storage() {
    return {
      from: (bucket: string) => ({
        upload: async (path: string, _file: any) => {
          return { data: { path: `${bucket}/${path}` }, error: null }
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: `/uploads/${bucket}/${path}` } }
        },
        createSignedUrl: async (path: string, _expiresIn: number) => {
          return { data: { signedUrl: `/uploads/${bucket}/${path}` }, error: null }
        },
        remove: async (_paths: string[]) => {
          return { data: {}, error: null }
        },
      }),
    }
  }
}

export function createLocalClient(initialUser?: LocalUser | null) {
  return new LocalSupabaseClient(initialUser)
}
