// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { room_code, host_key, game_state } = await request.json()

    if (!room_code || !host_key || !game_state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Find room and verify host
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, host_key')
      .eq('room_code', room_code.toUpperCase())
      .single()

    if (roomError || !room || (room as any).host_key !== host_key) {
      return NextResponse.json(
        { error: 'Unauthorized or room not found' },
        { status: 403 }
      )
    }

    // Update game state
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({
        game_state: game_state as any,
        last_activity_at: new Date().toISOString(),
      } as any)
      .eq('id', (room as any).id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update game state' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, game_state })
  } catch (error) {
    console.error('Game state update error:', error)
    return NextResponse.json(
      { error: 'Failed to update game state' },
      { status: 500 }
    )
  }
}
