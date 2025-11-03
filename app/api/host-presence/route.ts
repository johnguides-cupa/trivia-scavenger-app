// @ts-nocheck
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { room_id } = await request.json()

    if (!room_id) {
      return NextResponse.json({ error: 'Room ID required' }, { status: 400 })
    }

    // Update the last_host_ping timestamp
    const { error } = await supabase
      .from('rooms')
      .update({ 
        last_host_ping: new Date().toISOString()
      })
      .eq('id', room_id)

    // Ignore errors if column doesn't exist yet (graceful degradation)
    if (error && !error.message?.includes('column') && !error.message?.includes('last_host_ping')) {
      console.error('Error updating host presence:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Host presence error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
