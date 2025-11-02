// @ts-nocheck
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API route for cleanup of expired rooms and presets
 * Can be called manually or scheduled via cron (Vercel Cron, external service, etc.)
 * 
 * GET /api/cleanup
 */
export async function GET(request: Request) {
  try {
    // Optional: Add authentication/authorization here
    // For example, check for a secret token in headers
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CLEANUP_SECRET_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Call the Supabase cleanup function
    const { error: cleanupError } = await supabaseAdmin.rpc('cleanup_expired_data')

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError)
      return NextResponse.json(
        { error: 'Cleanup failed', details: cleanupError.message },
        { status: 500 }
      )
    }

    // Additional manual cleanup for very old data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Delete expired rooms
    const { data: deletedRooms, error: roomError } = await supabaseAdmin
      .from('rooms')
      .delete()
      .lt('expires_at', sevenDaysAgo)
      .select('id')

    // Delete expired presets
    const { data: deletedPresets, error: presetError } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('is_preset', true)
      .lt('preset_expires_at', new Date().toISOString())
      .select('id')

    return NextResponse.json({
      success: true,
      deleted_rooms: deletedRooms?.length || 0,
      deleted_presets: deletedPresets?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cleanup route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
