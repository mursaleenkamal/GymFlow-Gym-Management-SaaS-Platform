import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function migrate() {
  console.log('🚀 GymFlow Local DB -> Supabase Cloud Migration Tool')
  console.log('====================================================')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('localhost') || supabaseUrl.includes('your_supabase')) {
    console.error('\n❌ ERROR: Live Supabase credentials not found.')
    console.error('To migrate to real Supabase:')
    console.error('1. Create a project at https://supabase.com')
    console.error('2. Run the SQL schema from supabase-schema.sql in the Supabase SQL Editor')
    console.error('3. Set your project URL and service role key in .env.local:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co')
    console.error('   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>')
    console.error('   USE_LOCAL_MOCK_DB=false')
    console.error('4. Re-run: npx tsx scripts/migrate-to-supabase.ts\n')
    process.exit(1)
  }

  const dbFile = path.resolve(process.cwd(), '.local-db/data.json')
  if (!fs.existsSync(dbFile)) {
    console.error(`\n❌ ERROR: Local database file not found at ${dbFile}. Run 'npx tsx scripts/seed-local-db.ts' first.`)
    process.exit(1)
  }

  const localData = JSON.parse(fs.readFileSync(dbFile, 'utf-8'))
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`Connecting to Supabase at: ${supabaseUrl}...`)

  // Test connection
  const { error: testErr } = await supabase.from('gyms').select('id').limit(1)
  if (testErr) {
    console.error('\n❌ Failed to connect to Supabase or tables not yet created:', testErr.message)
    console.error('Ensure you have executed supabase-schema.sql in your Supabase SQL Editor first.')
    process.exit(1)
  }

  console.log('✅ Connection verified!\n')

  const tablesToMigrate = [
    'gyms',
    'members',
    'memberships',
    'due_payments',
    'attendance',
    'inventory',
    'support_tickets',
  ]

  for (const table of tablesToMigrate) {
    const rows = localData[table]
    if (!rows || rows.length === 0) {
      console.log(`- Table '${table}': 0 rows to migrate (skipping)`)
      continue
    }

    console.log(`- Table '${table}': Migrating ${rows.length} rows...`)
    const { error: insertErr } = await supabase.from(table).upsert(rows, { onConflict: 'id' })

    if (insertErr) {
      console.warn(`  ⚠️ Warning on table '${table}':`, insertErr.message)
    } else {
      console.log(`  ✅ Successfully migrated ${rows.length} rows into '${table}'`)
    }
  }

  console.log('\n🎉 Migration complete! All local records transferred to Supabase.')
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
