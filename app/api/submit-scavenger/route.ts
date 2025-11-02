// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { room_code, player_id, question_id } = await request.json();

    if (!room_code || !player_id || !question_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get room ID from room code
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('room_code', room_code)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if player has already submitted for this question
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('scavenger_submissions')
      .select('id')
      .eq('player_id', player_id)
      .eq('question_id', question_id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing submission:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing submission' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Already submitted for this challenge' },
        { status: 400 }
      );
    }

    // Get the next submission order for this question
    const { count, error: countError } = await supabaseAdmin
      .from('scavenger_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', question_id);

    if (countError) {
      console.error('Error counting submissions:', countError);
      return NextResponse.json(
        { error: 'Failed to count submissions' },
        { status: 500 }
      );
    }

    const submissionOrder = (count || 0) + 1;

    // Create submission
    const { data: submission, error: submitError } = await (supabaseAdmin
      .from('scavenger_submissions') as any)
      .insert({
        room_id: (room as any).id,
        player_id,
        question_id,
        submitted_at: new Date().toISOString(),
        submission_order: submissionOrder,
        approved: null, // null means pending
        approved_by_host_at: null,
        points_awarded: 0
      })
      .select()
      .single();

    if (submitError || !submission) {
      console.error('Error creating submission:', submitError);
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submission_id: (submission as any).id
    });
  } catch (error) {
    console.error('Error in submit-scavenger:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
