import { performance } from 'node:perf_hooks'
import { serializeMockSession } from '../lib/supabase/config'

async function benchmarkSteadyState() {
  const testUserId = 'test-owner-perf-123'
  const mockSessionCookie = `gymflow_mock_session=${encodeURIComponent(
    serializeMockSession({ userId: testUserId, email: 'owner@gymflow.test', name: 'Gym Owner' })
  )}`

  const baseUrl = 'http://localhost:3004'
  const routes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Members List', path: '/members' },
    { name: 'Dues', path: '/dues' },
    { name: 'Payments', path: '/payments' },
    { name: 'Attendance', path: '/attendance' },
    { name: 'Account Settings', path: '/account' },
    { name: 'New Member Page', path: '/members/new' },
    { name: 'Inventory', path: '/inventory' }
  ]

  console.log('--- WARMING UP ALL ROUTES ---')
  for (const r of routes) {
    await fetch(`${baseUrl}${r.path}`, {
      headers: { Cookie: mockSessionCookie },
      redirect: 'manual'
    }).catch(() => {})
  }

  console.log('\n--- STEADY-STATE BENCHMARKS (10 Consecutive Iterations Each) ---')
  console.log('Route'.padEnd(20) + ' | Avg TTFB | Min TTFB | Max TTFB | P95 TTFB | Status')
  console.log(''.padEnd(75, '-'))

  for (const r of routes) {
    const latencies: number[] = []
    let lastStatus = 0

    for (let i = 0; i < 10; i++) {
      const t0 = performance.now()
      const res = await fetch(`${baseUrl}${r.path}`, {
        headers: { Cookie: mockSessionCookie },
        redirect: 'manual'
      })
      const t1 = performance.now()
      lastStatus = res.status
      latencies.push(t1 - t0)
    }

    latencies.sort((a, b) => a - b)
    const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)
    const min = latencies[0].toFixed(1)
    const max = latencies[latencies.length - 1].toFixed(1)
    const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(1)

    console.log(
      `${r.name.padEnd(20)} | ${(avg + ' ms').padStart(8)} | ${(min + ' ms').padStart(8)} | ${(max + ' ms').padStart(8)} | ${(p95 + ' ms').padStart(8)} | HTTP ${lastStatus}`
    )
  }
}

benchmarkSteadyState()
