import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer();
    
    if (!supabase) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY' 
      }, { status: 500 });
    }

    // Create table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS strategy_messages (
        id BIGSERIAL PRIMARY KEY,
        strategy_id INTEGER NOT NULL,
        user_address TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_strategy_messages_strategy_id ON strategy_messages(strategy_id);
      CREATE INDEX IF NOT EXISTS idx_strategy_messages_created_at ON strategy_messages(created_at);

      ALTER TABLE strategy_messages ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Anyone can read strategy messages" ON strategy_messages;
      CREATE POLICY "Anyone can read strategy messages"
        ON strategy_messages
        FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "Authenticated users can insert messages" ON strategy_messages;
      CREATE POLICY "Authenticated users can insert messages"
        ON strategy_messages
        FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Users can update own messages" ON strategy_messages;
      CREATE POLICY "Users can update own messages"
        ON strategy_messages
        FOR UPDATE
        USING (true);

      DROP POLICY IF EXISTS "Users can delete own messages" ON strategy_messages;
      CREATE POLICY "Users can delete own messages"
        ON strategy_messages
        FOR DELETE
        USING (true);
    `;

    // Execute SQL using Supabase RPC or direct query
    // Note: Supabase JS client doesn't support raw SQL directly
    // We'll use the REST API or provide instructions
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Please run the SQL migration manually in Supabase Dashboard',
      sql: createTableSQL,
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Navigate to SQL Editor',
        '3. Copy and paste the SQL from web/supabase_migration.sql',
        '4. Click Run',
        '5. Verify table exists in Table Editor'
      ]
    });
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Setup failed' },
      { status: 500 }
    );
  }
}

