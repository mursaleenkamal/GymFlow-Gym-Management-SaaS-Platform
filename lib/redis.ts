import { Redis } from '@upstash/redis'

let _redisInstance: Redis | null = null
let _hasWarned = false

function createOrGetRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!_hasWarned) {
      console.warn('⚠️  Redis credentials missing. Caching disabled.')
      _hasWarned = true
    }
    return null
  }
  if (!_redisInstance) {
    _redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redisInstance
}

export function getRedisClient(): Redis | null {
  return createOrGetRedis()
}

// Proxy export for backward compatibility with modules importing `redis` directly
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedisClient()
    if (!client) {
      // Safe no-op if Redis is not configured
      return () => Promise.resolve(null)
    }
    const val = (client as any)[prop]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

