import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { submission_id, approved } = await request.json();

    if (!submission_id || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get submission details to calculate points
    const { data: submission, error: fetchError } = await (supabaseAdmin
      .from('scavenger_submissions') as any)
      .select(`
        id,
        player_id,
        question_id,
        submission_order,
        room_id,
        rooms!inner (
          settings
        )
      `)
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      console.error('Error fetching submission:', fetchError);
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const settings = (submission as any).rooms?.settings || {};
    let pointsAwarded = 0;

    if (approved) {
      // Award points based on submission order
      if (submission.submission_order === 1) {
        pointsAwarded = settings.points_for_first_scavenger || 10;
      } else {
        pointsAwarded = settings.points_for_other_approved_scavengers || 5;
      }
    } else {
      // Award consolation points for rejection
      pointsAwarded = settings.points_for_rejected_scavengers || 2;
    }

    // Update submission
    const { error: updateError } = await (supabaseAdmin
      .from('scavenger_submissions') as any)
      .update({
        approved,
        approved_by_host_at: new Date().toISOString(),
        points_awarded: pointsAwarded
      })
      .eq('id', submission_id);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    // Update player points
    const { data: player, error: playerFetchError } = await supabaseAdmin
      .from('players')
      .select('points')
      .eq('id', submission.player_id)
      .single();

    if (playerFetchError || !player) {
      console.error('Error fetching player:', playerFetchError);
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    const newPoints = ((player as any).points || 0) + pointsAwarded;

    const { error: pointsError } = await (supabaseAdmin
      .from('players') as any)
      .update({ points: newPoints })
      .eq('id', submission.player_id);

    if (pointsError) {
      console.error('Error updating player points:', pointsError);
      return NextResponse.json(
        { error: 'Failed to update player points' },
        { status: 500 }
      );
    }

    console.log('✅ [SERVER] Scavenger reviewed:', {
      submission_id,
      player_id: submission.player_id,
      approved,
      points_awarded: pointsAwarded,
      new_total: newPoints
    });

    return NextResponse.json({
      success: true,
      points_awarded: pointsAwarded
    });
  } catch (error) {
    console.error('Error in review-scavenger:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
