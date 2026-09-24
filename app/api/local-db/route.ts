import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/local-db/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(store.dump())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body && typeof body === 'object') {
      store.setAll(body)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
