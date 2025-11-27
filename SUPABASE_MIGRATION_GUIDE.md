# Firebase to Supabase Migration Guide

## ✅ Migration Complete

All Firebase code has been replaced with Supabase throughout the codebase.

## 📋 Changes Made

### 1. Client-Side Configuration
**File**: `web/src/lib/firebaseConfig.ts` → `web/src/lib/supabaseConfig.ts`

- Replaced Firebase client with Supabase client
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Same hook pattern: `useSupabase()` instead of `useFirebase()`

### 2. Server-Side Configuration
**File**: `web/src/lib/supabaseServer.ts` (NEW)

- Server-side Supabase client for API routes
- Uses `SUPABASE_SERVICE_ROLE_KEY` (or falls back to anon key)
- Bypasses RLS for server operations

### 3. Strategy Chat Component
**File**: `web/src/components/StrategyChat.tsx`

- Replaced Firestore with Supabase real-time subscriptions
- Uses `strategy_messages` table instead of Firestore collections
- Real-time updates via Supabase Realtime

### 4. Chat API Route
**File**: `web/src/app/api/chat/send/route.ts`

- Replaced Firebase Admin with Supabase server client
- Inserts messages into `strategy_messages` table
- No more Firebase service account needed

## 🔧 Environment Variables

### web/.env.local
```env
# Supabase Client Config (replaces Firebase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Supabase Server Config (optional, for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Other (unchanged)
RPC_URL=your_rpc_url
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=your_address
OPENAI_API_KEY=your_key
NEXT_PUBLIC_INDEXER_URL=http://localhost:4000
DATABASE_URL=your_database_url
```

## 🗄️ Database Setup

### 1. Run SQL Migration
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the SQL from `web/supabase_migration.sql`

Or run via CLI:
```bash
psql $DATABASE_URL < web/supabase_migration.sql
```

### 2. Table Structure
```sql
strategy_messages
├── id (BIGSERIAL PRIMARY KEY)
├── strategy_id (INTEGER)
├── user_address (TEXT)
├── message (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### 3. Row Level Security (RLS)
- ✅ Enabled on `strategy_messages` table
- ✅ Anyone can read messages
- ✅ Anyone can insert messages (verify signature in API)
- ✅ Indexes for performance

## 📦 Dependencies

Supabase is already installed:
- ✅ `@supabase/supabase-js: ^2.86.0` (already in package.json)

You can optionally remove Firebase packages:
```bash
cd web
npm uninstall firebase firebase-admin
```

## 🔄 Migration Steps

1. **Set Environment Variables**:
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
   - Optionally add `SUPABASE_SERVICE_ROLE_KEY` for admin operations

2. **Create Database Table**:
   - Run `web/supabase_migration.sql` in Supabase SQL Editor

3. **Restart Dev Server**:
   ```bash
   cd web
   npm run dev
   ```

4. **Test**:
   - Join a strategy
   - Open chat
   - Send a message
   - Should work with Supabase!

## 🗑️ Files to Remove (Optional)

After confirming everything works, you can remove:
- `web/src/lib/firebaseConfig.ts` (replaced by `supabaseConfig.ts`)
- `security.jsonc` (Firebase Firestore rules, not needed for Supabase)

## 🔐 Security Notes

### Current Setup
- RLS allows all reads and inserts
- API route verifies wallet signature before inserting
- In production, consider:
  - Adding RLS policies that check `user_address`
  - Using Supabase Auth for additional verification
  - Restricting updates/deletes to message owners

### Recommended Production RLS Policies
```sql
-- Only allow inserts with verified signatures (handled in API)
-- Only allow users to update/delete their own messages
CREATE POLICY "Users can update own messages"
  ON strategy_messages
  FOR UPDATE
  USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');

CREATE POLICY "Users can delete own messages"
  ON strategy_messages
  FOR DELETE
  USING (user_address = current_setting('request.jwt.claims', true)::json->>'address');
```

## ✅ Verification Checklist

- [ ] Environment variables set in `.env.local`
- [ ] Database table created (`strategy_messages`)
- [ ] RLS policies enabled
- [ ] Dev server restarted
- [ ] Chat component loads without errors
- [ ] Messages can be sent
- [ ] Real-time updates work
- [ ] No Firebase references in console

## 🐛 Troubleshooting

### "Supabase not configured"
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart dev server after adding variables

### "Table does not exist"
- Run the SQL migration in Supabase SQL Editor
- Check table name is `strategy_messages` (not `strategyChats`)

### "Real-time not working"
- Enable Realtime in Supabase Dashboard → Database → Replication
- Check table is enabled for replication

### "RLS blocking inserts"
- Check RLS policies in Supabase Dashboard
- Verify policies allow inserts

## 🎉 Migration Complete!

All Firebase code has been replaced with Supabase. The chat functionality now uses:
- Supabase PostgreSQL database
- Supabase Realtime for live updates
- Supabase RLS for security

No more Firebase dependencies needed!

