import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/**
 * Check if at least one player has submitted an answer for a specific question
 * This prevents auto-advancing when all players are temporarily disconnected
 */
export async function POST(request: NextRequest) {
  try {
    const { room_id, question_id } = await request.json()

    if (!room_id || !question_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Count submissions for this question in this room
    const { count, error } = await supabaseAdmin
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room_id)
      .eq('question_id', question_id)

    if (error) {
      console.error('Error checking submissions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      hasSubmissions: (count ?? 0) > 0,
      submissionCount: count ?? 0
    })
  } catch (error) {
    console.error('Error in check-submissions:', error)
    return NextResponse.json(
      { error: 'Failed to check submissions' },
      { status: 500 }
    )
  }
}
