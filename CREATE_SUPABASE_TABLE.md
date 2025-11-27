# Create Supabase Table - Quick Guide

## ⚠️ Error: Table 'strategy_messages' does not exist

You need to create the table in Supabase. Follow these steps:

## Method 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**:
   - Visit https://app.supabase.com
   - Select your project

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**:
   - Copy the entire contents of `web/supabase_migration.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Table Created**:
   - Go to "Table Editor" in left sidebar
   - You should see `strategy_messages` table
   - Check that it has columns: id, strategy_id, user_address, message, created_at, updated_at

## Method 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## Method 3: Direct SQL (Quick Fix)

If you just need the table quickly, run this in Supabase SQL Editor:

```sql
-- Quick create table
CREATE TABLE IF NOT EXISTS strategy_messages (
  id BIGSERIAL PRIMARY KEY,
  strategy_id INTEGER NOT NULL,
  user_address TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE strategy_messages ENABLE ROW LEVEL SECURITY;

-- Allow reads
CREATE POLICY "Anyone can read" ON strategy_messages FOR SELECT USING (true);

-- Allow inserts
CREATE POLICY "Anyone can insert" ON strategy_messages FOR INSERT WITH CHECK (true);
```

## ✅ After Creating Table

1. **Restart your dev server** (if running)
2. **Test chat** - should work now!
3. **Enable Realtime** (optional, for live updates):
   - Go to Database → Replication
   - Enable replication for `strategy_messages` table

## 🐛 Troubleshooting

### "Permission denied"
- Make sure you're using the service role key in API routes
- Or adjust RLS policies to allow your operations

### "Table still not found"
- Check table name is exactly `strategy_messages` (lowercase)
- Verify you're connected to the correct Supabase project
- Check the schema is `public`

### "RLS blocking inserts"
- Check RLS policies in Supabase Dashboard
- Verify policies allow INSERT operations

## 📝 Full Migration File

See `web/supabase_migration.sql` for the complete migration with:
- Table creation
- Indexes
- RLS policies
- Triggers

