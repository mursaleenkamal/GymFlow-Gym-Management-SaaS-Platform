import 'dotenv/config'
import { getRedisClient } from '../lib/redis'
import { performance } from 'node:perf_hooks'

async function testRedis() {
  const client = getRedisClient()
  if (!client) {
    console.log('Redis client is null (no env vars).')
    return
  }
  console.log('Testing Redis connection...')
  try {
    const t0 = performance.now()
    await client.set('perf_test_key', 'hello', { ex: 10 })
    const t1 = performance.now()
    const val = await client.get('perf_test_key')
    const t2 = performance.now()
    await client.del('perf_test_key')
    const t3 = performance.now()
    console.log('Redis SET latency:', (t1 - t0).toFixed(2), 'ms')
    console.log('Redis GET latency:', (t2 - t1).toFixed(2), 'ms (value:', val, ')')
    console.log('Redis DEL latency:', (t3 - t2).toFixed(2), 'ms')
  } catch (e: any) {
    console.error('Redis error:', e.message)
  }
}
testRedis()
