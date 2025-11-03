// @ts-nocheck
'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { generateRoomCode, generateHostKey, computeTriviaPoints, computeScavengerPoints } from '@/lib/utils'
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  SubmitAnswerRequest,
  SubmitScavengerRequest,
  ApproveScavengerRequest,
  UpdateGameStateRequest,
  GameSettings,
  GameState,
} from '@/types'

/**
 * Generate default questions for a room
 */
function generateDefaultQuestions(roomId: string, settings: GameSettings) {
  const defaultQuestions = [
    {
      stem: 'What color do you get when you mix blue and yellow?',
      choices: [
        { id: 'a', label: 'Red', is_correct: false },
        { id: 'b', label: 'Green', is_correct: true },
        { id: 'c', label: 'Orange', is_correct: false },
        { id: 'd', label: 'Purple', is_correct: false }
      ],
      scavenger: 'Find something or someone wearing the color green! 💚'
    },
    {
      stem: 'What do bees make?',
      choices: [
        { id: 'a', label: 'Wax', is_correct: false },
        { id: 'b', label: 'Pollen', is_correct: false },
        { id: 'c', label: 'Honey', is_correct: true },
        { id: 'd', label: 'Nectar', is_correct: false }
      ],
      scavenger: 'Find something or someone that\'s as "sweet as honey!" 🍯 (Could be a snack, drink, or a cheerful officemate!)'
    },
    {
      stem: 'Which part of your body lets you smell?',
      choices: [
        { id: 'a', label: 'Nose', is_correct: true },
        { id: 'b', label: 'Eyes', is_correct: false },
        { id: 'c', label: 'Mouth', is_correct: false },
        { id: 'd', label: 'Hands', is_correct: false }
      ],
      scavenger: 'Find something or someone that smells good! 🌸 (Perfume, food, air freshener — or your officemate with the nicest cologne!)'
    },
    {
      stem: 'What do you call a baby cat?',
      choices: [
        { id: 'a', label: 'Cub', is_correct: false },
        { id: 'b', label: 'Kitten', is_correct: true },
        { id: 'c', label: 'Pup', is_correct: false },
        { id: 'd', label: 'Calf', is_correct: false }
      ],
      scavenger: 'Find something or someone small and cute! 🐱 (Stuffed toy, small item, or the youngest person in the room!)'
    },
    {
      stem: 'How many days are there in a leap year?',
      choices: [
        { id: 'a', label: '365', is_correct: false },
        { id: 'b', label: '364', is_correct: false },
        { id: 'c', label: '366', is_correct: true },
        { id: 'd', label: '367', is_correct: false }
      ],
      scavenger: 'Find something that represents the number 366! (Calculator showing the number, calendar, or be creative!)'
    }
  ]

  const questions = []
  let questionIndex = 0

  for (let round = 1; round <= settings.number_of_rounds; round++) {
    for (let qNum = 1; qNum <= settings.questions_per_round; qNum++) {
      const q = defaultQuestions[questionIndex % defaultQuestions.length]
      questions.push({
        room_id: roomId,
        round_number: round,
        question_number: qNum,
        stem: q.stem,
        choices: q.choices,
        scavenger_instruction: q.scavenger,
      })
      questionIndex++
    }
  }

  return questions
}

/**
 * Create a new room
 */
export async function createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
  try {
    console.log('🎮 [SERVER] createRoom called')
    console.log('🎮 [SERVER] Request host_client_uuid:', request.host_client_uuid)
    console.log('🎮 [SERVER] Request object:', JSON.stringify(request, null, 2))
    
    const roomCode = generateRoomCode()
    const hostKey = generateHostKey()

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const presetExpiresAt = request.is_preset ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null

    const roomData = {
      room_code: roomCode,
      host_client_uuid: request.host_client_uuid || 'anonymous',
      host_key: hostKey,
      title: request.title,
      is_preset: request.is_preset || false,
      preset_expires_at: presetExpiresAt?.toISOString() || null,
      expires_at: expiresAt.toISOString(),
      settings: request.settings as any,
      game_state: {
        status: 'lobby',
        current_round: 0,
        current_question: 0,
      } as any,
    }

    console.log('🎮 [SERVER] Inserting room with UUID:', roomData.host_client_uuid)

    // Insert room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .insert(roomData as any)
      .select()
      .single()

    if (roomError || !room) {
      console.error('❌ [SERVER] Error creating room:', roomError)
      throw new Error('Failed to create room')
    }
    
    console.log('✅ [SERVER] Room created successfully!')
    console.log('📦 [SERVER] Room data:', JSON.stringify(room, null, 2))

    // Type assertion for room
    const roomRecord = room as any

    // Insert default questions if none provided
    const questionsToInsert = request.questions && request.questions.length > 0
      ? request.questions.map(q => ({
          room_id: roomRecord.id,
          round_number: q.round_number,
          question_number: q.question_number,
          stem: q.stem,
          choices: q.choices as any,
          scavenger_instruction: q.scavenger_instruction,
        }))
      : generateDefaultQuestions(roomRecord.id, request.settings)

    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .insert(questionsToInsert as any)

    if (questionsError) {
      console.error('Error creating questions:', questionsError)
      // Don't fail the room creation if questions fail
    }

    return {
      room: roomRecord,
      host_key: hostKey,
    }
  } catch (error) {
    console.error('Error in createRoom:', error)
    throw error
  }
}

/**
 * Join a room as a player
 */
export async function joinRoom(request: JoinRoomRequest): Promise<JoinRoomResponse> {
  try {
    // Find room by code
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_code', request.room_code.toUpperCase())
      .single()

    if (roomError || !room) {
      throw new Error('Room not found')
    }

    const roomRecord = room as any

    // Check if player already exists with this UUID
    const { data: existingPlayer } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('room_id', roomRecord.id)
      .eq('client_uuid', request.client_uuid)
      .single()

    const existingPlayerRecord = existingPlayer as any

    if (existingPlayerRecord) {
      // Player is rejoining - update their connection status
      const { data: updatedPlayer, error: updateError } = await supabaseAdmin
        .from('players')
        .update({
          connected: true,
          last_seen_at: new Date().toISOString(),
          display_name: request.display_name, // Update name if changed
        } as any)
        .eq('id', existingPlayerRecord.id)
        .select()
        .single()

      if (updateError || !updatedPlayer) {
        throw new Error('Failed to rejoin room')
      }

      return {
        player: updatedPlayer as any,
        room: room as any,
      }
    }

    // Check if display name is taken
    const { data: existingPlayers } = await supabaseAdmin
      .from('players')
      .select('display_name')
      .eq('room_id', room.id)

    const takenNames = existingPlayers?.map(p => p.display_name) || []
    let uniqueName = request.display_name

    // Append number if name is taken
    let counter = 1
    while (takenNames.includes(uniqueName)) {
      uniqueName = `${request.display_name}${counter}`
      counter++
    }

    // Create new player
    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .insert({
        room_id: room.id,
        client_uuid: request.client_uuid,
        display_name: uniqueName,
        connected: true,
      } as any)
      .select()
      .single()

    if (playerError || !player) {
      console.error('Error creating player:', playerError)
      throw new Error('Failed to join room')
    }

    return {
      player: player as any,
      room: room as any,
    }
  } catch (error) {
    console.error('Error in joinRoom:', error)
    throw error
  }
}

/**
 * Submit a trivia answer
 */
export async function submitAnswer(request: SubmitAnswerRequest) {
  try {
    console.log('📝 [SERVER] Submit answer:', request)
    
    // Get question to check correct answer
    const { data: question, error: questionError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', request.question_id)
      .single()

    console.log('📝 [SERVER] Question found:', { questionId: question?.id, error: questionError })

    if (questionError || !question) {
      throw new Error('Question not found')
    }

    // Get room settings
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('settings')
      .eq('id', request.room_id)
      .single()

    const settings = (room?.settings || {}) as GameSettings
    const choices = question.choices as any[]
    const selectedChoice = choices.find(c => c.id === request.answer_choice_id)
    const isCorrect = selectedChoice?.is_correct || false

    console.log('📝 [SERVER] Answer check:', { selectedChoice: request.answer_choice_id, isCorrect })

    // Compute points
    const points = computeTriviaPoints(
      isCorrect,
      settings.trivia_base_point || 100,
      settings.time_per_trivia_question || 30,
      request.answer_time_ms,
      settings.trivia_time_scaling !== false
    )

    console.log('📝 [SERVER] Points computed:', points)

    // Insert submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('submissions')
      .insert({
        room_id: request.room_id,
        player_id: request.player_id,
        question_id: request.question_id,
        answer_choice_id: request.answer_choice_id,
        answer_time_ms: request.answer_time_ms,
        is_correct: isCorrect,
        points_awarded: points,
      } as any)
      .select()
      .single()

    console.log('📝 [SERVER] Submission created:', { submissionId: submission?.id, error: submissionError })

    if (submissionError) {
      console.error('❌ Error creating submission:', submissionError)
      throw new Error('Failed to submit answer')
    }

    // Update player points using atomic RPC function
    console.log('📝 [SERVER] Adding points:', {
      playerId: request.player_id,
      pointsToAdd: points
    })

    // Use RPC function for atomic increment (prevents race conditions and caching issues)
    const { data: updatedPlayer, error: rpcError } = await supabaseAdmin
      .rpc('increment_player_points', {
        player_uuid: request.player_id,
        points_to_add: points
      })
      .single()
    
    if (rpcError) {
      console.error('❌ RPC error:', rpcError)
      throw new Error(`Failed to update points: ${rpcError.message}`)
    }
    
    if (!updatedPlayer) {
      console.error('❌ No data returned from RPC')
      throw new Error('Failed to update points - no data returned')
    }
    
    console.log('✅ [SERVER] Points updated successfully:', {
      playerName: updatedPlayer.display_name,
      newTotal: updatedPlayer.points,
      pointsAdded: points
    })

    return { submission, points }
  } catch (error) {
    console.error('❌ Error in submitAnswer:', error)
    throw error
  }
}

/**
 * Submit scavenger completion
 */
export async function submitScavenger(request: SubmitScavengerRequest) {
  try {
    // Get existing submissions for this question to determine order
    const { data: existingSubmissions } = await supabaseAdmin
      .from('scavenger_submissions')
      .select('submission_order')
      .eq('question_id', request.question_id)
      .order('submission_order', { ascending: false })
      .limit(1)

    const submissionOrder = (existingSubmissions?.[0]?.submission_order || 0) + 1

    // Insert scavenger submission
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('scavenger_submissions')
      .insert({
        room_id: request.room_id,
        player_id: request.player_id,
        question_id: request.question_id,
        submission_order: submissionOrder,
        approved: null, // Pending approval
        points_awarded: 0,
      } as any)
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating scavenger submission:', submissionError)
      throw new Error('Failed to submit scavenger')
    }

    return { submission }
  } catch (error) {
    console.error('Error in submitScavenger:', error)
    throw error
  }
}

/**
 * Approve or reject a scavenger submission (host only)
 */
export async function approveScavenger(request: ApproveScavengerRequest) {
  try {
    // Verify host key
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_key, settings')
      .eq('id', request.room_id)
      .single()

    if (!room || room.host_key !== request.host_key) {
      throw new Error('Unauthorized')
    }

    const settings = room.settings as GameSettings

    // Get submission
    const { data: submission } = await supabaseAdmin
      .from('scavenger_submissions')
      .select('*, question_id')
      .eq('id', request.submission_id)
      .single()

    if (!submission) {
      throw new Error('Submission not found')
    }

    // Determine if this is the first approved submission
    const { data: approvedSubmissions } = await supabaseAdmin
      .from('scavenger_submissions')
      .select('id')
      .eq('question_id', submission.question_id)
      .eq('approved', true)

    const isFirstApproved = request.approved && (approvedSubmissions?.length || 0) === 0

    // Calculate points
    const points = computeScavengerPoints(
      request.approved,
      isFirstApproved,
      settings.points_for_first_scavenger || 10,
      settings.points_for_other_approved_scavengers || 5,
      settings.points_for_rejected_scavengers || 2
    )

    // Update submission
    const { error: updateError } = await supabaseAdmin
      .from('scavenger_submissions')
      .update({
        approved: request.approved,
        approved_by_host_at: new Date().toISOString(),
        points_awarded: points,
      } as any)
      .eq('id', request.submission_id)

    if (updateError) {
      throw new Error('Failed to update submission')
    }

    // Update player points using atomic RPC function
    const { data: updatedPlayer, error: rpcError } = await supabaseAdmin
      .rpc('increment_player_points', {
        player_uuid: (submission as any).player_id,
        points_to_add: points
      })
      .single()

    if (rpcError) {
      console.error('❌ Scavenger RPC error:', rpcError)
      throw new Error(`Failed to update scavenger points: ${rpcError.message}`)
    }

    console.log('✅ [SERVER] Scavenger reviewed:', {
      submission_id: request.submission_id,
      player_id: (submission as any).player_id,
      approved: request.approved,
      points_awarded: points,
      new_total: updatedPlayer?.points
    })

    return { points }
  } catch (error) {
    console.error('Error in approveScavenger:', error)
    throw error
  }
}

/**
 * Update game state (host only)
 */
export async function updateGameState(request: UpdateGameStateRequest) {
  try {
    // Verify host key
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_key, game_state')
      .eq('id', request.room_id)
      .single()

    if (!room || room.host_key !== request.host_key) {
      throw new Error('Unauthorized')
    }

    const currentState = room.game_state as GameState
    const newState = { ...currentState, ...request.game_state }

    // Update room
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({
        game_state: newState as any,
        last_activity_at: new Date().toISOString(),
      } as any)
      .eq('id', request.room_id)

    if (updateError) {
      throw new Error('Failed to update game state')
    }

    return { game_state: newState }
  } catch (error) {
    console.error('Error in updateGameState:', error)
    throw error
  }
}

/**
 * Start the game (host only)
 */
export async function startGame(roomCode: string, hostKey: string) {
  try {
    console.log('🎮 [SERVER] Starting game...', { roomCode, hostKey })
    
    // Find room and verify host
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single()

    console.log('🎮 [SERVER] Found room:', { room: room?.id, error: roomError })

    if (roomError || !room || room.host_key !== hostKey) {
      console.error('🎮 [SERVER] Auth failed:', { roomError, hasRoom: !!room, keyMatch: room?.host_key === hostKey })
      throw new Error('Unauthorized or room not found')
    }

    // Reset all player points to 0 for new game
    console.log('🎮 [SERVER] Resetting player points...')
    const { error: resetPointsError } = await (supabaseAdmin
      .from('players') as any)
      .update({ points: 0 })
      .eq('room_id', room.id)

    if (resetPointsError) {
      console.error('🎮 [SERVER] Failed to reset points:', resetPointsError)
    }

    // Delete all previous submissions (trivia answers)
    console.log('🎮 [SERVER] Clearing trivia submissions...')
    const { error: deleteSubmissionsError } = await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('room_id', room.id)

    if (deleteSubmissionsError) {
      console.error('🎮 [SERVER] Failed to clear submissions:', deleteSubmissionsError)
    }

    // Delete all previous scavenger submissions
    console.log('🎮 [SERVER] Clearing scavenger submissions...')
    const { error: deleteScavengerError } = await supabaseAdmin
      .from('scavenger_submissions')
      .delete()
      .eq('room_id', room.id)

    if (deleteScavengerError) {
      console.error('🎮 [SERVER] Failed to clear scavenger submissions:', deleteScavengerError)
    }

    // Get first question
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('room_id', room.id)
      .eq('round_number', 1)
      .eq('question_number', 1)
      .single()

    console.log('🎮 [SERVER] Found question:', questions?.id)

    // Update game state to trivia phase
    // Add 3 seconds to question_start_time for countdown (3...2...1...GO!)
    const countdownDelay = 3000 // 3 seconds
    const questionStartTime = new Date(Date.now() + countdownDelay).toISOString()
    
    const updatePayload = {
      game_state: {
        status: 'trivia',
        current_round: 1,
        current_question: 1,
        question_start_time: questionStartTime,
      },
      last_activity_at: new Date().toISOString(),
    }
    
    console.log('🎮 [SERVER] Updating room with:', updatePayload)
    
    const { data: updatedRoom, error: updateError } = await supabaseAdmin
      .from('rooms')
      .update(updatePayload as any)
      .eq('id', room.id)
      .select()
      .single()

    console.log('🎮 [SERVER] Update result:', { updatedRoom, updateError })

    if (updateError) {
      console.error('🎮 [SERVER] Update failed:', updateError)
      throw new Error('Failed to start game')
    }

    console.log('🎮 [SERVER] Game reset complete - all player data cleared')

    return { 
      success: true, 
      currentQuestion: questions,
      gameState: {
        status: 'trivia',
        current_round: 1,
        current_question: 1,
      }
    }
  } catch (error) {
    console.error('Error in startGame:', error)
    throw error
  }
}

/**
 * Restart game - reset scores and return to lobby
 */
export async function restartGame(roomCode: string, hostKey: string) {
  try {
    console.log('🔄 [SERVER] Restarting game...', { roomCode })
    
    // Find room and verify host
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single()

    if (roomError || !room || room.host_key !== hostKey) {
      throw new Error('Unauthorized or room not found')
    }

    // Reset all player points to 0
    console.log('🔄 [SERVER] Resetting player points...')
    await supabaseAdmin
      .from('players')
      .update({ points: 0 } as any)
      .eq('room_id', room.id)

    // Delete all previous submissions (trivia answers)
    console.log('🔄 [SERVER] Clearing trivia submissions...')
    await supabaseAdmin
      .from('submissions')
      .delete()
      .eq('room_id', room.id)

    // Delete all previous scavenger submissions
    console.log('🔄 [SERVER] Clearing scavenger submissions...')
    await supabaseAdmin
      .from('scavenger_submissions')
      .delete()
      .eq('room_id', room.id)

    // Update game state to lobby
    const updatePayload = {
      game_state: {
        status: 'lobby',
        current_round: 1,
        current_question: 1,
      },
      last_activity_at: new Date().toISOString(),
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update(updatePayload as any)
      .eq('id', room.id)

    if (updateError) {
      throw new Error('Failed to restart game')
    }

    console.log('🔄 [SERVER] Game restarted - returned to lobby with all data cleared')

    return { success: true }
  } catch (error) {
    console.error('Error in restartGame:', error)
    throw error
  }
}

/**
 * Get leaderboard for a room
 */
export async function getLeaderboard(roomId: string) {
  try {
    const { data: players, error } = await supabaseAdmin
      .from('players')
      .select('id, display_name, points')
      .eq('room_id', roomId)
      .order('points', { ascending: false })

    if (error) {
      throw new Error('Failed to get leaderboard')
    }

    const leaderboard = (players || []).map((player, index) => ({
      player_id: player.id,
      display_name: player.display_name,
      points: player.points,
      rank: index + 1,
    }))

    return leaderboard
  } catch (error) {
    console.error('Error in getLeaderboard:', error)
    throw error
  }
}

/**
 * Save leaderboard snapshot
 */
export async function saveLeaderboardSnapshot(roomId: string) {
  try {
    const leaderboard = await getLeaderboard(roomId)

    const { error } = await supabaseAdmin
      .from('leaderboard_snapshots')
      .insert({
        room_id: roomId,
        payload: leaderboard as any,
      } as any)

    if (error) {
      throw new Error('Failed to save leaderboard')
    }

    return { leaderboard }
  } catch (error) {
    console.error('Error in saveLeaderboardSnapshot:', error)
    throw error
  }
}

/**
 * Update player connection status
 */
export async function updatePlayerConnection(playerId: string, connected: boolean) {
  try {
    await supabaseAdmin
      .from('players')
      .update({
        connected,
        last_seen_at: new Date().toISOString(),
      } as any)
      .eq('id', playerId)
  } catch (error) {
    console.error('Error updating player connection:', error)
  }
}

/**
 * Get user's rooms (both hosted and joined)
 */
export async function getUserRooms(clientUuid: string) {
  // Disable caching
  'use server'
  revalidatePath('/', 'page')
  
  try {
    console.log('🔍 [SERVER] Getting rooms for UUID:', clientUuid)
    
    // Force fresh data by adding a timestamp to prevent caching
    const now = new Date().toISOString()
    
    // WORKAROUND: Due to RLS issues, fetch all recent rooms and filter manually
    const { data: allRooms, error: allRoomsError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      // Force fresh read by filtering on timestamp (always true, but prevents cache)
      .gte('created_at', '2020-01-01T00:00:00.000Z')

    if (allRoomsError) {
      console.error('❌ [SERVER] Error fetching rooms:', allRoomsError)
      return []
    }

    console.log('📊 [SERVER] Fetched rooms from DB:', allRooms?.length || 0, 'at', now)
    
    // Debug: Show sample of UUIDs in database
    if (allRooms && allRooms.length > 0) {
      console.log('🔍 [SERVER] Sample UUIDs in DB:', allRooms.slice(0, 3).map((r: any) => ({
        room_code: r.room_code,
        host_client_uuid: r.host_client_uuid,
        uuid_type: typeof r.host_client_uuid
      })))
    }
    
    console.log('🔍 [SERVER] Searching for UUID:', clientUuid, 'Type:', typeof clientUuid)
    
    // Manually filter hosted rooms
    const hostedRooms = (allRooms || []).filter((room: any) => {
      const match = room.host_client_uuid === clientUuid
      if (match) {
        console.log('✅ [SERVER] MATCH FOUND:', room.room_code)
      }
      return match
    })
    console.log('✅ [SERVER] Found hosted rooms (manual filter):', hostedRooms.length)

    // Get ALL player records and filter manually (RLS workaround)
    const { data: allPlayers, error: playerError } = await supabaseAdmin
      .from('players')
      .select('room_id, client_uuid')
      .limit(1000)

    if (playerError) {
      console.error('❌ [SERVER] Error fetching player records:', playerError)
    }

    const playerRoomIds = (allPlayers || [])
      .filter((p: any) => p.client_uuid === clientUuid)
      .map((p: any) => p.room_id)
    
    console.log('✅ [SERVER] Found player records (manual filter):', playerRoomIds.length)

    // Filter joined rooms from already fetched rooms
    const joinedRooms = (allRooms || []).filter((room: any) => 
      playerRoomIds.includes(room.id) && room.host_client_uuid !== clientUuid
    )

    // Combine and deduplicate
    const hosted = (hostedRooms || []) as any[]
    const joined = joinedRooms as any[]
    
    // Remove duplicates by room ID
    const roomMap = new Map()
    hosted.forEach((room: any) => roomMap.set(room.id, { ...room, role: 'host' }))
    joined.forEach((room: any) => {
      if (!roomMap.has(room.id)) {
        roomMap.set(room.id, { ...room, role: 'player' })
      }
    })

    const result = Array.from(roomMap.values())
    console.log('✅ [SERVER] Total unique rooms:', result.length)
    console.log('📦 [SERVER] Returning rooms:', JSON.stringify(result, null, 2))
    
    return result
  } catch (error) {
    console.error('❌ [SERVER] Error in getUserRooms:', error)
    return []
  }
}
