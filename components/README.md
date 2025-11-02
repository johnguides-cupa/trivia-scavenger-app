# Components Directory

Reusable UI components for the Trivia Scavenger Game.

## Available Components

### `<Timer />`
Displays countdown timer with progress bar.

**Props**:
- `seconds: number` - Current seconds remaining
- `totalSeconds: number` - Total duration
- `isRunning: boolean` - Whether timer is active
- `variant?: 'trivia' | 'scavenger'` - Color scheme

**Usage**:
```tsx
<Timer seconds={30} totalSeconds={30} isRunning={true} variant="trivia" />
```

---

### `<Leaderboard />`
Displays player rankings with scores.

**Props**:
- `entries: LeaderboardEntry[]` - Array of player scores
- `currentPlayerId?: string` - Highlights current player
- `showConfetti?: boolean` - Show celebration animation

**Usage**:
```tsx
<Leaderboard entries={leaderboard} currentPlayerId={playerId} />
```

---

### `<AudioControls />`
Fixed audio control panel with music and sound effect toggles.

**Props**: None (uses `useAudio` hook internally)

**Usage**:
```tsx
<AudioControls />
```

---

### `<ConfirmModal />`
Confirmation dialog for important actions.

**Props**:
- `isOpen: boolean` - Controls visibility
- `title: string` - Modal title
- `message: string` - Confirmation message
- `confirmText?: string` - Confirm button label
- `cancelText?: string` - Cancel button label
- `onConfirm: () => void` - Confirm callback
- `onCancel: () => void` - Cancel callback
- `variant?: 'default' | 'danger'` - Button color

**Usage**:
```tsx
<ConfirmModal
  isOpen={showModal}
  title="Submit Scavenger?"
  message="Are you sure you've completed the challenge?"
  onConfirm={handleSubmit}
  onCancel={() => setShowModal(false)}
/>
```

---

### `<PlayerList />`
Displays connected and disconnected players.

**Props**:
- `players: Player[]` - Array of players
- `showPoints?: boolean` - Show player scores

**Usage**:
```tsx
<PlayerList players={players} showPoints={true} />
```

---

## Creating New Components

### Component Template

```tsx
'use client'

import type { YourType } from '@/types'

interface YourComponentProps {
  // Define props
}

export function YourComponent({ }: YourComponentProps) {
  return (
    <div>
      {/* Your JSX */}
    </div>
  )
}

export default YourComponent
```

### Best Practices

1. **Use TypeScript**: Define prop interfaces
2. **Client Components**: Add `'use client'` if using hooks
3. **Export Default**: Makes imports cleaner
4. **Accessibility**: Use semantic HTML and ARIA labels
5. **Responsive**: Mobile-first with Tailwind classes

---

## Component Ideas for Future Development

- `<QuestionCard />` - Trivia question display
- `<AnswerButton />` - Multiple choice option
- `<ScavengerCard />` - Scavenger challenge display
- `<HostControls />` - Host action buttons
- `<RoomCodeDisplay />` - Large room code for sharing
- `<CountdownAnimation />` - 3-2-1 countdown
- `<ConfettiEffect />` - Winner celebration
- `<PlayerAvatar />` - Player profile picture/icon

---

## Styling Guidelines

Use Tailwind utility classes from `globals.css`:

- **Cards**: `card` or `card-hover` classes
- **Buttons**: `btn-primary`, `btn-secondary`, `btn-accent`, `btn-outline`, `btn-ghost`
- **Inputs**: `input` class
- **Animations**: `animate-fadeIn`, `animate-slideIn`, `animate-pulse-scale`

### Color Palette

- **Primary**: Red/Pink (`primary-*`)
- **Secondary**: Blue (`secondary-*`)
- **Accent**: Yellow (`accent-*`)
- **Status**: Green (success), Red (danger), Gray (neutral)

---

Happy Component Building! 🎨
