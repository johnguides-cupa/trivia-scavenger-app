# TRIVIA SCAVENGER GAME - TESTING GUIDE

## Current Implementation Status

### ✅ WORKING FEATURES
1. **Room Creation**
   - Host can create room with custom settings
   - Auto-generates 6 default trivia questions
   - Questions cycle based on rounds/questions settings
   - Room code generation

2. **Player Joining**
   - Players join via room code
   - Display names saved
   - Real-time player list updates
   - Duplicate name handling

3. **Game Flow - Trivia Only**
   - Lobby → Playing → Finished
   - Start game button (host only)
   - Question display (host + players)
   - Answer submission (players)
   - Next question/round progression (host)
   - Final leaderboard

4. **Real-time Sync**
   - Game state updates across all clients
   - Player list updates
   - Question changes

### ⚠️ PARTIALLY IMPLEMENTED
1. **Scoring System**
   - Server-side logic exists
   - Points calculated but may not update UI immediately
   - Need to verify realtime score updates

2. **Timer**
   - Component exists but not integrated
   - No auto-advance on timeout

### ❌ NOT YET IMPLEMENTED
1. **Scavenger Hunt Phase**
   - No photo/video upload
   - No host approval interface
   - Questions have scavenger instructions but not used

2. **Advanced Features**
   - Custom question builder
   - Audio cues
   - Animations
   - Detailed answer feedback

## HOW TO TEST (STEP BY STEP)

### Prerequisites
```bash
# 1. Ensure Supabase is configured
#    - .env.local has valid credentials
#    - SQL migrations have been run (001 and 002)

# 2. Start the dev server
npm run dev
```

### Test Flow

#### 1. CREATE ROOM (as Host)
1. Go to `http://localhost:3000`
2. Click "Host Game"
3. Fill in:
   - Game Title: "Test Game"
   - Rounds: 2
   - Questions per Round: 3
   - Keep other defaults
   - ENSURE "Use Default Questions" is CHECKED
4. Click "Create Room"
5. **EXPECTED**: Redirect to `/host/[ROOM_CODE]`
6. **VERIFY**:
   - Room code displayed (e.g., ABC123)
   - "Waiting for Players" screen
   - Game settings shown correctly
   - "Start Game" button disabled (no players yet)

#### 2. JOIN AS PLAYER 1
1. Open NEW BROWSER/INCOGNITO WINDOW
2. Go to `http://localhost:3000/player/join`
3. Enter:
   - Room Code: [the code from step 1]
   - Your Name: "Alice"
4. Click "Join Game"
5. **EXPECTED**: Redirect to `/player/[ROOM_CODE]`
6. **VERIFY**:
   - See "Waiting to Start" screen
   - See "Alice" in player list
   - Room code displayed

#### 3. JOIN AS PLAYER 2 (Optional)
1. Open ANOTHER BROWSER/INCOGNITO WINDOW
2. Go to `http://localhost:3000/player/join`
3. Enter Room Code + Name: "Bob"
4. **VERIFY**:
   - Both Alice and Bob see updated player list
   - Host sees 2 players

#### 4. START GAME (as Host)
1. Go back to HOST window
2. **VERIFY**: "Start Game" button now enabled
3. Click "Start Game"
4. **EXPECTED**:
   - Game state changes to "playing"
   - First question appears on host screen
   - Question shows: text + 4 choices
   - Correct answer highlighted in green
   - Shows "Round 1 / 2" and "Question 1 / 3"

#### 5. PLAYERS SEE QUESTION
1. Go to PLAYER windows
2. **VERIFY**:
   - Same question displayed
   - 4 clickable answer buttons
   - No correct answer shown
   - Round/Question number displayed

#### 6. SUBMIT ANSWER (as Player)
1. As Alice, click any answer button
2. **EXPECTED**:
   - Answer submits immediately
   - See "✓ Answer Submitted!" message
   - "Waiting for other players..." text
   - Can't change answer

#### 7. NEXT QUESTION (as Host)
1. Go to HOST window
2. Click "Next Question" button
3. **EXPECTED**:
   - Question 2 appears
   - All players see new question
   - Question counter updates: "Question 2 / 3"
   - Players can answer again

#### 8. COMPLETE ROUND
1. Continue answering + clicking "Next Question"
2. After Question 3:
   - Click "Next Question" again
   - **EXPECTED**: Round 2, Question 1 appears
   - Counter shows "Round 2 / 2"

#### 9. FINISH GAME
1. Complete all questions in Round 2
2. After last question, click "Next Question"
3. **EXPECTED**:
   - Game status changes to "finished"
   - Host sees "Game Over!" screen
   - Final leaderboard displayed
   - "Play Again" and "Exit Room" buttons

#### 10. PLAYERS SEE RESULTS
1. Go to PLAYER windows
2. **VERIFY**:
   - "Game Over!" screen
   - Player's final score shown
   - Full leaderboard
   - "Join Another Game" button

## KNOWN ISSUES & LIMITATIONS

### Issues to Fix
1. **Scores may not update in real-time**
   - Server calculates points
   - Leaderboard might not refresh until page reload
   - FIX: Check Supabase realtime subscriptions

2. **No timer countdown**
   - Questions stay forever
   - Manual "Next Question" required
   - FIX: Integrate Timer component

3. **No validation**
   - Can advance questions even if players haven't answered
   - No "waiting for answers" UI
   - FIX: Add submission tracking

4. **Type errors (non-critical)**
   - Supabase type definitions show errors
   - Doesn't affect runtime
   - FIX: Generate proper DB types

### Features Not Implemented
- Scavenger hunt phase (photos/videos)
- Host approval interface
- Custom question builder
- Audio effects
- Animations
- Detailed statistics
- Room persistence (rooms expire after 24h)

## TROUBLESHOOTING

### "Failed to create room"
- Check Supabase credentials in `.env.local`
- Verify migrations were run
- Check browser console for errors

### "Room not found" when joining
- Verify room code is correct (case-insensitive)
- Check if room exists in Supabase dashboard
- Room may have expired

### Questions don't appear
- Check browser console
- Verify questions table has data
- Check network tab for API errors

### Players don't see updates
- Supabase realtime may be disconnected
- Check browser console for websocket errors
- Try refreshing the page

### Scores don't update
- Check browser console
- Verify `submitAnswer` server action succeeds
- Check Supabase `players` table manually

## NEXT STEPS FOR COMPLETION

1. **Scoring Fix** - Ensure real-time score updates work
2. **Timer Integration** - Add countdown + auto-advance
3. **Scavenger Phase** - Photo upload + host review
4. **Polish** - Animations, sounds, better UX
5. **Testing** - Full E2E test with multiple players

## SUMMARY

**The game currently works for basic trivia gameplay:**
- ✅ Create room
- ✅ Join players
- ✅ Display questions
- ✅ Submit answers
- ✅ Progress through rounds
- ✅ View final results

**Missing for complete experience:**
- Scavenger hunt
- Real-time timers
- Verified scoring updates
- Polish & UX improvements
