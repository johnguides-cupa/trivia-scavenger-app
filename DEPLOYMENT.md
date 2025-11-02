# Deployment Checklist

## Pre-Deployment Setup

### 1. Supabase Configuration

- [ ] Create a new Supabase project at [supabase.com](https://supabase.com)
- [ ] Copy your project URL and keys from Project Settings → API
- [ ] Run migrations in SQL Editor:
  - [ ] Execute `supabase/migrations/001_initial_schema.sql`
  - [ ] Execute `supabase/migrations/002_seed_data.sql`
- [ ] Verify tables were created in Table Editor
- [ ] Enable Realtime for all tables:
  - [ ] Go to Database → Replication
  - [ ] Enable replication for: `rooms`, `players`, `questions`, `submissions`, `scavenger_submissions`
- [ ] Test RLS policies by making a test query

### 2. Environment Variables

Create `.env.local` for development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLEANUP_SECRET_TOKEN=your-random-secret-here
```

Generate `CLEANUP_SECRET_TOKEN`:
```bash
openssl rand -base64 32
```

### 3. Local Development Test

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, run tests
npm test

# Test key flows:
# 1. Create a room as host
# 2. Join the room as player (different browser/incognito)
# 3. Submit a trivia answer
# 4. Submit a scavenger completion
# 5. Approve/reject as host
# 6. View leaderboard
```

## Vercel Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Trivia Scavenger Game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trivia-scavenger-game.git
git push -u origin main
```

### 2. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### 3. Set Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain | Production, Preview, Development |
| `CLEANUP_SECRET_TOKEN` | Your secret token | Production, Preview, Development |

**Important**: Use different Supabase projects for production and preview if handling sensitive data.

### 4. Deploy

Click "Deploy" and wait for build to complete.

### 5. Set Up Cron Job (Optional)

Vercel Cron is configured in `vercel.json`:
- Cleanup runs daily at 2 AM UTC
- Deletes expired rooms and presets
- Requires Vercel Pro plan

**Alternative**: Use external cron service (e.g., cron-job.org):
```
URL: https://your-app.vercel.app/api/cleanup
Method: GET
Header: Authorization: Bearer YOUR_CLEANUP_SECRET_TOKEN
Schedule: Daily at 2:00 AM
```

### 6. Post-Deployment Verification

- [ ] Visit your production URL
- [ ] Create a test room
- [ ] Join as player from mobile device
- [ ] Test trivia submission
- [ ] Test scavenger submission
- [ ] Verify realtime updates work
- [ ] Check Vercel logs for errors
- [ ] Test audio controls
- [ ] Verify responsive design on mobile

## Production Optimizations

### 1. Supabase

- [ ] Set up Row Level Security properly
- [ ] Enable database connection pooling
- [ ] Set up database backups
- [ ] Monitor database performance in Supabase dashboard

### 2. Vercel

- [ ] Enable Analytics (optional, Pro plan)
- [ ] Set up custom domain (if desired)
- [ ] Configure Edge Functions if needed
- [ ] Set up monitoring/alerts

### 3. Performance

- [ ] Enable Vercel Analytics
- [ ] Monitor Core Web Vitals
- [ ] Optimize images (already using Next.js Image)
- [ ] Review bundle size: `npm run build` → check output

### 4. Security

- [ ] Never commit `.env.local` to git (already in `.gitignore`)
- [ ] Rotate service role key if exposed
- [ ] Review RLS policies regularly
- [ ] Keep dependencies updated: `npm audit`

## Scaling Considerations

### For 200+ Concurrent Players

1. **Supabase**:
   - Upgrade to Pro plan for better resources
   - Enable connection pooling
   - Use Supabase Edge Functions for heavy computations
   - Monitor database query performance

2. **Vercel**:
   - Upgrade to Pro plan for better performance
   - Use Edge Functions for lower latency
   - Enable preview deployments for testing

3. **Realtime**:
   - Supabase Realtime is optimized for this scale
   - Monitor WebSocket connections in Supabase dashboard
   - Consider implementing reconnection logic with exponential backoff

### Database Indexing

Already implemented in migrations:
- `idx_rooms_room_code` for fast room lookups
- `idx_players_room_id` for player queries
- `idx_questions_room_id` for question fetching
- `idx_submissions_player_id` for score calculations

### Caching Strategy

Consider adding:
- Redis for session caching (optional)
- CDN for static assets (Vercel handles this)
- Supabase edge caching for read-heavy queries

## Monitoring

### Vercel Logs

```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs YOUR_PROJECT_URL
```

### Supabase Logs

- Database → Logs in Supabase dashboard
- Monitor query performance
- Set up log drains to external services (optional)

### Application Metrics

Key metrics to monitor:
- Room creation rate
- Player join rate
- Submission latency
- Realtime connection count
- Error rate in server actions

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check TypeScript errors: `npm run type-check`
   - Verify all environment variables are set
   - Review Vercel build logs

2. **Realtime Not Working**
   - Verify Realtime is enabled in Supabase
   - Check RLS policies allow SELECT on tables
   - Inspect browser console for WebSocket errors

3. **Players Can't Join**
   - Verify room code is correct
   - Check room hasn't expired
   - Review server action logs in Vercel

4. **Slow Performance**
   - Check Supabase query performance
   - Review database indexes
   - Monitor Vercel function execution time

## Rollback Plan

If deployment fails:

1. Revert to previous deployment in Vercel dashboard
2. Check Vercel logs for specific error
3. Test fix locally before redeploying
4. Use preview deployments for testing

## Post-Launch

- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor user feedback
- [ ] Plan feature updates
- [ ] Regular security audits
- [ ] Database maintenance schedule

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Support

For issues:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console
4. Open GitHub issue with details

---

**Ready to deploy? Follow the checklist and your game will be live in minutes!** 🚀
