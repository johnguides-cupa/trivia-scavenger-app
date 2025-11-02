// Test Supabase connection
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

console.log('=== Supabase Connection Test ===\n')

// Check environment variables
console.log('1. Environment Variables:')
console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing')
console.log()

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.log('❌ Missing environment variables. Please check your .env.local file.\n')
  process.exit(1)
}

// Test anon client
console.log('2. Testing Anon Client Connection...')
const supabase = createClient(supabaseUrl, supabaseAnonKey)

supabase
  .from('rooms')
  .select('count')
  .then(({ data, error }) => {
    if (error) {
      console.log('   ❌ Anon client error:', error.message)
    } else {
      console.log('   ✓ Anon client connected successfully')
    }
  })
  .then(() => {
    // Test admin client
    console.log('\n3. Testing Admin Client Connection...')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    return supabaseAdmin
      .from('rooms')
      .select('*')
      .limit(1)
  })
  .then(({ data, error }) => {
    if (error) {
      console.log('   ❌ Admin client error:', error.message)
      console.log('   Error details:', error)
    } else {
      console.log('   ✓ Admin client connected successfully')
      console.log('   Found', data?.length || 0, 'room(s) in database')
      if (data && data.length > 0) {
        console.log('   Sample room:', data[0].room_code)
      }
    }
    console.log('\n=== Test Complete ===\n')
  })
  .catch(err => {
    console.log('   ❌ Unexpected error:', err.message)
  })
