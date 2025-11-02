// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get('room_code');
    const questionId = searchParams.get('question_id');

    if (!roomCode || !questionId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get room ID
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('room_code', roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Get pending submissions (approved is null) with player names
    const { data: submissions, error: submissionsError } = await (supabaseAdmin
      .from('scavenger_submissions') as any)
      .select(`
        id,
        player_id,
        submitted_at,
        submission_order,
        players!inner (
          display_name
        )
      `)
      .eq('question_id', questionId)
      .is('approved', null)
      .order('submission_order', { ascending: true });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Format the response
    const formattedSubmissions = (submissions || []).map((s: any) => ({
      id: s.id,
      player_id: s.player_id,
      player_name: s.players?.display_name || 'Unknown',
      submitted_at: s.submitted_at,
      submission_order: s.submission_order
    }));

    return NextResponse.json({
      submissions: formattedSubmissions
    });
  } catch (error) {
    console.error('Error in scavenger-submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
