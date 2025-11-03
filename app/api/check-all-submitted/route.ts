// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { question_id, player_count } = await request.json();

    if (!question_id || !player_count) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Count how many players have submitted for this scavenger challenge
    const { count, error } = await supabaseAdmin
      .from('scavenger_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', question_id);

    if (error) {
      console.error('Error counting scavenger submissions:', error);
      return NextResponse.json(
        { error: 'Failed to check submissions' },
        { status: 500 }
      );
    }

    const all_submitted = (count || 0) >= player_count;

    return NextResponse.json({
      all_submitted,
      submitted_count: count || 0,
      player_count
    });
  } catch (error) {
    console.error('Error in check-all-submitted:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
