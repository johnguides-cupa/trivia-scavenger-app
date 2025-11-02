# Scoring Rules and Implementation

## Overview

This document explains the scoring formulas used in the Trivia Scavenger Party Game and the business rules implemented for point allocation.

## Trivia Scoring

### Formula

```typescript
points = base_points × (0.5 + 0.5 × (1 - elapsed_time_ms / time_limit_ms))
```

### Parameters

- **`base_points`**: Configurable base value (default: 100)
- **`elapsed_time_ms`**: Time taken to answer in milliseconds
- **`time_limit_ms`**: Total time allowed for the question in milliseconds
- **`time_scaling`**: Boolean flag to enable/disable time-based scaling

### Behavior

1. **Incorrect Answer**: Always returns 0 points, regardless of time taken

2. **Time Scaling Disabled**: Returns full `base_points` for correct answers

3. **Time Scaling Enabled** (Kahoot-style):
   - **Minimum Points**: 50% of base points (even if answered at time limit)
   - **Maximum Points**: 100% of base points (instant answer)
   - **Linear Interpolation**: Points decrease linearly based on answer speed

### Examples

Given `base_points = 100` and `time_limit = 30 seconds`:

| Answer Time | Calculation | Points Awarded |
|-------------|-------------|----------------|
| 0s (instant) | 100 × (0.5 + 0.5 × 1.0) | 100 |
| 7.5s (25%) | 100 × (0.5 + 0.5 × 0.75) | 88 |
| 15s (50%) | 100 × (0.5 + 0.5 × 0.5) | 75 |
| 22.5s (75%) | 100 × (0.5 + 0.5 × 0.25) | 63 |
| 30s (limit) | 100 × (0.5 + 0.5 × 0.0) | 50 |

### Implementation Details

**Location**: `lib/utils.ts` → `computeTriviaPoints()`

```typescript
export function computeTriviaPoints(
  isCorrect: boolean,
  basePoints: number,
  timeLimitSeconds: number,
  elapsedMs: number,
  timeScaling: boolean = true
): number {
  if (!isCorrect) {
    return 0
  }

  if (!timeScaling) {
    return basePoints
  }

  const timeLimitMs = timeLimitSeconds * 1000
  const timeRatio = Math.max(0, Math.min(1, elapsedMs / timeLimitMs))
  
  const minPointsRatio = 0.5
  const scaledRatio = minPointsRatio + (1 - minPointsRatio) * (1 - timeRatio)
  
  return Math.round(basePoints * scaledRatio)
}
```

**Server Action**: `app/actions.ts` → `submitAnswer()`

The server action:
1. Retrieves the question to check the correct answer
2. Fetches room settings for scoring parameters
3. Computes points using the formula
4. Stores the submission with awarded points
5. Updates the player's total points

## Scavenger Scoring

### Point Values

- **First Approved Submission**: Configurable (default: 10 points)
- **Other Approved Submissions**: Configurable (default: 5 points)
- **Rejected Submissions**: Configurable (default: 2 points)
- **Pending Submissions**: 0 points until reviewed

### Rules

1. **Submission Order**:
   - Each scavenger submission is assigned a `submission_order` (1, 2, 3, ...)
   - Order is based on when players click "Done"

2. **"First Approved" Definition**:
   - The first submission that receives approval from the host
   - **Important**: NOT necessarily the first submission by time
   - If the first submitter is rejected, the next approved submission becomes "first approved"

3. **Approval Process**:
   - Host reviews submissions in submission order
   - Host clicks "Approve" or "Reject" for each
   - Points are calculated and awarded immediately upon approval/rejection

4. **Point Allocation Examples**:

   **Scenario 1: First Submitter Approved**
   - Player A submits first → Approved → 10 points (first approved)
   - Player B submits second → Approved → 5 points (other approved)
   - Player C submits third → Rejected → 2 points

   **Scenario 2: First Submitter Rejected**
   - Player A submits first → Rejected → 2 points
   - Player B submits second → Approved → 10 points (becomes first approved!)
   - Player C submits third → Approved → 5 points (other approved)

   **Scenario 3: All Rejected**
   - Player A submits first → Rejected → 2 points
   - Player B submits second → Rejected → 2 points
   - No "first approved" in this question

### Implementation Details

**Location**: `lib/utils.ts` → `computeScavengerPoints()`

```typescript
export function computeScavengerPoints(
  approved: boolean | null,
  isFirstApproved: boolean,
  firstApprovedPoints: number = 10,
  otherApprovedPoints: number = 5,
  rejectedPoints: number = 2
): number {
  if (approved === null) {
    return 0 // Pending
  }

  if (approved === false) {
    return rejectedPoints
  }

  // Approved
  return isFirstApproved ? firstApprovedPoints : otherApprovedPoints
}
```

**Server Action**: `app/actions.ts` → `approveScavenger()`

The server action:
1. Verifies the host's authorization using `host_key`
2. Retrieves the submission and question context
3. Checks if any submissions for this question were previously approved
4. Determines if this is the "first approved" (no prior approvals)
5. Calculates points using the formula
6. Updates the submission with approval status and points
7. Adds points to the player's total score

### Edge Cases Handled

1. **Concurrent Approvals**: Database transactions ensure atomic updates
2. **Re-approval**: Not supported; once approved/rejected, decision is final
3. **Player Disconnect**: Submissions remain valid; points awarded when reconnected
4. **Host Disconnect**: Pending submissions remain in database; new host can review

## Testing

Comprehensive unit tests are provided in `__tests__/scoring.test.ts`:

- **Trivia Tests**: Correct/incorrect, time scaling on/off, edge cases (instant, limit)
- **Scavenger Tests**: Pending, rejected, first approved, other approved
- **Edge Case Tests**: First submitter rejection, point bounds, custom values

Run tests:
```bash
npm test
```

## Server-Side Enforcement

All scoring calculations occur **server-side** to prevent cheating:

1. Clients submit answers/completions to server actions
2. Server validates submissions (one per player per question)
3. Server computes points using authoritative game settings
4. Server updates database and broadcasts results via Realtime

## Leaderboard Calculation

Leaderboard is generated by:
1. Querying all players in a room
2. Ordering by total points (descending)
3. Assigning ranks (1st, 2nd, 3rd, etc.)
4. Handling ties: players with equal points receive the same rank

**Location**: `app/actions.ts` → `getLeaderboard()`

## Configuration

Hosts can customize all scoring parameters when creating a room:

- Trivia base points (50-1000)
- Time-based scoring toggle
- First approved scavenger points (1-100)
- Other approved scavenger points (1-50)
- Rejected scavenger points (0-10)

Settings are stored in the `rooms.settings` JSONB column and used throughout the game.

## Summary

The scoring system balances:
- **Skill**: Correct trivia answers required
- **Speed**: Faster responses earn more points
- **Participation**: Even rejected scavenger submissions earn points
- **Fairness**: First to complete scavenger gets rewarded, but quality (approval) matters more

This creates engaging gameplay where both knowledge and quick thinking are rewarded, while ensuring everyone participates and has fun!
