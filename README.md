# Trivia Scavenger Party Game

A vibrant, real-time multiplayer party game combining trivia questions with scavenger hunt challenges. Built with Next.js, TypeScript, Supabase, and deployed on Vercel.

## 🎮 Features

- **Real-time Multiplayer**: Up to 200 concurrent players per room using Supabase Realtime
- **No Authentication Required**: UUID-based localStorage sessions for instant play
- **Mobile-First Design**: Optimized player experience in portrait mode, desktop-optimized host dashboard
- **Kahoot-Style Scoring**: Time-based points for trivia questions (faster = more points)
- **Scavenger Hunt Challenges**: Host approves/rejects player submissions with tiered point rewards
- **Live Leaderboard**: Real-time score tracking with confetti animations
- **Audio Controls**: Background music and sound effects with user-controlled mute toggles
- **Room Management**: 24-hour room expiration, 7-day preset storage with automatic cleanup
- **Rejoin Support**: Players and hosts can reconnect and resume sessions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Vercel account (for deployment)

### Local Development Setup

1. **Clone and Install**

```bash
cd trivia_scavenger_game
npm install
```

2. **Set Up Supabase**

- Create a new project at [supabase.com](https://supabase.com)
- Wait for your project to finish setting up (~2 minutes)
- Go to **Project Settings** → **API** → Copy your credentials:
  - Project URL
  - `anon` `public` key
  - `service_role` `secret` key
- Go to **SQL Editor** (in the left sidebar) and run the migrations:
  
  **Step 2a: Run Initial Schema**
  1. Click **New Query** button (or the `+` icon)
  2. Open `supabase/migrations/001_initial_schema.sql` in your code editor
  3. Copy the **entire contents** of the file
  4. Paste it into the Supabase SQL Editor
  5. Click **Run** (or press Ctrl+Enter)
  6. Wait for "Success. No rows returned" message
  
  **Step 2b: Run Seed Data**
  1. Click **New Query** again
  2. Open `supabase/migrations/002_seed_data.sql` in your code editor
  3. Copy the **entire contents** of the file
  4. Paste it into the Supabase SQL Editor
  5. Click **Run** (or press Ctrl+Enter)
  6. You should see "Success. Rows affected: X"
  
- Verify tables were created: Go to **Table Editor** → you should see 7 tables (user_sessions, rooms, players, questions, submissions, scavenger_submissions, leaderboard_snapshots)

3. **Configure Environment Variables**

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run Development Server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm test
```

## 📁 Project Structure

```
trivia_scavenger_game/
├── app/
│   ├── actions.ts              # Server actions for room/player management
│   ├── globals.css             # Global styles and Tailwind utilities
│   ├── layout.tsx              # Root layout with fonts
│   ├── page.tsx                # Landing page
│   ├── host/
│   │   ├── create/
│   │   │   └── page.tsx        # Host: create room page
│   │   └── [room_code]/
│   │       └── page.tsx        # Host: dashboard (create this file)
│   └── player/
│       ├── join/
│       │   └── page.tsx        # Player: join room page
│       └── [room_code]/
│           └── page.tsx        # Player: game screen (create this file)
├── components/                 # Reusable UI components (create as needed)
├── hooks/
│   ├── useRealtime.ts          # Realtime subscriptions and game timer
│   └── useAudio.ts             # Audio controls and sound effects
├── lib/
│   ├── supabase.ts             # Supabase client configuration
│   └── utils.ts                # Utility functions (UUID, room codes, scoring)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Database schema and RLS policies
│       └── 002_seed_data.sql         # Sample data for testing
├── types/
│   ├── index.ts                # Application types
│   └── database.ts             # Supabase database types
├── __tests__/
│   └── scoring.test.ts         # Unit tests for scoring logic
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🎯 How to Play

### For Hosts

1. **Create a Room**: Visit `/host/create` and customize game settings
2. **Share Room Code**: Give players the 6-character code
3. **Add Questions**: Input trivia questions with scavenger challenges
4. **Start Game**: Begin when all players are ready
5. **Review Submissions**: Approve/reject scavenger submissions during gameplay
6. **View Leaderboard**: Display final scores after all rounds

### For Players

1. **Join Room**: Enter room code at `/player/join`
2. **Set Display Name**: Choose how you'll appear to others
3. **Answer Trivia**: Tap the correct answer quickly for more points
4. **Complete Scavenger**: Follow the instruction and hit "Done"
5. **Win Points**: Top the leaderboard!

## 🔢 Scoring System

### Trivia Points

Formula: `points = base_points × (0.5 + 0.5 × (1 - elapsed_time / time_limit))`

- **Base Points**: Configurable (default: 100)
- **Time Scaling**: If enabled (Kahoot-style):
  - Instant answer: 100% of base (e.g., 100 points)
  - Halfway through time: 75% of base (e.g., 75 points)
  - At time limit: 50% of base (e.g., 50 points)
- **Wrong Answer**: 0 points

### Scavenger Points

- **First Approved Submission**: 10 points (default, configurable)
  - Rule: First player whose submission is approved by host
  - If first submitter is rejected, next approved becomes "first approved"
- **Other Approved Submissions**: 5 points (default, configurable)
- **Rejected Submissions**: 2 points (default, configurable)
- **Pending**: 0 points until host reviews

## 🗄️ Database Schema

### Tables

- **`user_sessions`**: Tracks client UUIDs
- **`rooms`**: Game rooms with settings and state
- **`players`**: Players in each room with scores
- **`questions`**: Trivia questions and scavenger instructions
- **`submissions`**: Trivia answer submissions
- **`scavenger_submissions`**: Scavenger completion submissions
- **`leaderboard_snapshots`**: Historical leaderboard data

### Row-Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow public reads for transparency
- Control writes via server-side validation
- Protect host operations with `host_key` verification
- Prevent SQL injection and unauthorized access

### Automatic Cleanup

The `cleanup_expired_data()` function removes:
- Rooms expired > 7 days ago
- Presets older than 7 days since last use

Call manually via SQL or schedule with Supabase Cron (pg_cron extension).

## 🚢 Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/trivia-scavenger-game)

### Manual Deploy

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/trivia-scavenger-game.git
git push -u origin main
```

2. **Deploy on Vercel**

- Go to [vercel.com](https://vercel.com) and import your GitHub repository
- Configure environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL` (your Vercel domain)

3. **Deploy**

Vercel will automatically build and deploy. Visit your production URL!

## 🔧 Configuration

### Game Settings (Host Configurable)

- **Number of Rounds**: 1-10
- **Questions per Round**: 1-20
- **Trivia Time**: 10-120 seconds
- **Scavenger Time**: 30-300 seconds
- **Trivia Base Points**: 50-1000
- **Time-Based Scoring**: On/Off
- **Scavenger Points**: Customizable for first, approved, and rejected

### Audio Settings (Player Configurable)

- **Background Music**: Toggle on/off
- **Music Mute**: Independent mute control
- **Sound Effects**: Toggle on/off (countdown, correct, wrong, leaderboard)

## 🎨 Customization

### Branding

Edit `tailwind.config.ts` to change color scheme:

```typescript
colors: {
  primary: { /* Your brand colors */ },
  secondary: { /* ... */ },
  accent: { /* ... */ },
}
```

### Audio Files

Replace Web Audio API generated tones with actual audio files:

1. Add MP3/OGG files to `public/audio/`
2. Update `hooks/useAudio.ts` to reference files:

```typescript
backgroundMusicRef.current.src = '/audio/background-music.mp3'
```

## 🐛 Troubleshooting

### Players Can't Join

- Verify room code is correct (case-insensitive)
- Check room hasn't expired (24 hours from creation)
- Ensure Supabase Realtime is enabled in project settings

### Host Lost Connection

- Host can rejoin using same browser (localStorage persists `host_key`)
- If localStorage cleared, host access is lost (security feature)

### Realtime Not Working

- Check Supabase project has Realtime enabled
- Verify RLS policies allow reads on relevant tables
- Check browser console for WebSocket errors

### TypeScript Errors

Run type check:

```bash
npm run type-check
```

Most errors related to missing `@types` packages will resolve after `npm install`.

## 📊 Performance Considerations

- **Target**: 200 concurrent players per room
- **Optimization Strategies**:
  - Realtime subscriptions filtered by `room_id`
  - Indexed database queries on `room_code`, `room_id`, `client_uuid`
  - Client-side debouncing for heartbeat updates
  - Lazy loading for leaderboard snapshots

## 🔐 Security

### Client UUID System

- **No Passwords**: UUIDs stored in localStorage
- **Rejoin Support**: Same UUID = same player
- **Host Protection**: `host_key` required for admin actions
- **Limitations**: Clearing localStorage = new identity

### Input Sanitization

- Display names: 20 chars max, alphanumeric + spaces/hyphens only
- Room codes: 6 chars, alphanumeric only
- All inputs validated server-side

### Rate Limiting

- Implement at Vercel/Supabase level if needed
- Consider debouncing frequent operations (heartbeats, submissions)

## 📝 TODO / Future Enhancements

- [ ] Host ability to kick players
- [ ] Image upload for scavenger submissions
- [ ] Custom question bank library
- [ ] Team mode (players in groups)
- [ ] Spectator mode
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard (game statistics)

## 📄 License

MIT License - feel free to use this project for your own parties!

## 🙏 Acknowledgments

- **Next.js**: React framework
- **Supabase**: Backend and realtime infrastructure
- **Tailwind CSS**: Styling framework
- **Vercel**: Hosting platform

## 📧 Support

For issues or questions, please open a GitHub issue or contact the maintainers.

---

**Built with ❤️ for epic party games!**
