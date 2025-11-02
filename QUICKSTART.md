# Quick Start Guide

Get your Trivia Scavenger Game running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)

## Step 1: Clone and Install (1 min)

```bash
cd trivia_scavenger_game
npm install
```

## Step 2: Set Up Supabase (2 min)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for project to be ready (~2 minutes)
3. Go to **Project Settings** → **API**
4. Copy these values:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

## Step 3: Run Database Migrations (1 min)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste `supabase/migrations/001_initial_schema.sql`
4. Click **Run**
5. Repeat for `supabase/migrations/002_seed_data.sql`

## Step 4: Configure Environment (30 sec)

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Start Playing! (30 sec)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Try It Out

1. **Create a Room**: Click "Host a Game" → Fill settings → Create
2. **Join as Player**: Open incognito/different browser → Click "Join a Game" → Enter room code
3. **Play**: Try the sample questions from seed data

## Next Steps

- **Add Your Questions**: Edit questions in host dashboard
- **Invite Friends**: Share the room code
- **Deploy to Production**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Troubleshooting

### Build Errors?

```bash
npm run type-check
```

### Can't Connect to Supabase?

- Verify URL and keys in `.env.local`
- Check Supabase project is active
- Ensure migrations ran successfully

### Realtime Not Working?

- Go to Supabase → **Database** → **Replication**
- Enable replication for all tables

## Need Help?

- Read [README.md](./README.md) for full documentation
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Review [SCORING_RULES.md](./SCORING_RULES.md) for game mechanics

---

**Happy Gaming!** 🎉
