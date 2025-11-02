import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { room_id, question_id, player_count } = await request.json();

    if (!room_id || !question_id || !player_count) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Count how many players have submitted answers for this question
    const { count, error } = await supabaseAdmin
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room_id)
      .eq('question_id', question_id);

    if (error) {
      console.error('Error counting submissions:', error);
      return NextResponse.json(
        { error: 'Failed to check submissions' },
        { status: 500 }
      );
    }

    const all_answered = (count || 0) >= player_count;

    return NextResponse.json({
      all_answered,
      answered_count: count || 0,
      player_count
    });
  } catch (error) {
    console.error('Error in check-all-answered:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
