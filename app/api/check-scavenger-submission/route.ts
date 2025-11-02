// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('player_id');
    const questionId = searchParams.get('question_id');

    if (!playerId || !questionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check if submission exists
    const { data: submission, error } = await (supabaseAdmin
      .from('scavenger_submissions') as any)
      .select('id')
      .eq('player_id', playerId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (error) {
      console.error('Error checking submission:', error);
      return NextResponse.json(
        { error: 'Failed to check submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      has_submitted: !!submission
    });
  } catch (error) {
    console.error('Error in check-scavenger-submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
