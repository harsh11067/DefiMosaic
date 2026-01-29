-- Supabase Migration: Strategy Messages Table
-- Run this in your Supabase SQL Editor

-- Create strategy_messages table
CREATE TABLE IF NOT EXISTS strategy_messages (
  id BIGSERIAL PRIMARY KEY,
  strategy_id INTEGER NOT NULL,
  user_address TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_strategy_messages_strategy_id ON strategy_messages(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_messages_created_at ON strategy_messages(created_at);

-- Enable Row Level Security
ALTER TABLE strategy_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read messages
CREATE POLICY "Anyone can read strategy messages"
  ON strategy_messages
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert messages
-- Note: In production, you should verify the user_address matches the authenticated user
CREATE POLICY "Authenticated users can insert messages"
  ON strategy_messages
  FOR INSERT
  WITH CHECK (true); -- For now, allow all inserts. In production, add proper auth check

-- Policy: Users can update their own messages (optional)
CREATE POLICY "Users can update own messages"
  ON strategy_messages
  FOR UPDATE
  USING (true); -- In production, add: user_address = auth.jwt() ->> 'address'

-- Policy: Users can delete their own messages (optional)
CREATE POLICY "Users can delete own messages"
  ON strategy_messages
  FOR DELETE
  USING (true); -- In production, add: user_address = auth.jwt() ->> 'address'

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_strategy_messages_updated_at
  BEFORE UPDATE ON strategy_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

