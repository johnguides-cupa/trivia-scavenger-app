import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { room_id, round_number, question_number } = await request.json()

    if (!room_id || !round_number || !question_number) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Fetch question
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('room_id', room_id)
      .eq('round_number', round_number)
      .eq('question_number', question_number)
      .single()

    if (error || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Question fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    )
  }
}
