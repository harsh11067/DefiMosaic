CREATE TABLE IF NOT EXISTS predictions (
id BIGINT PRIMARY KEY,
parent_id BIGINT,
creator TEXT,
pool TEXT,
collateral NUMERIC,
loan_amount NUMERIC,
leverage_bps INT,
deadline BIGINT,
resolved BOOLEAN DEFAULT false,
outcome BOOLEAN,
round_id BIGINT,
last_price NUMERIC,
price_target NUMERIC,
price_feed TEXT,
liquidated BOOLEAN DEFAULT false,
health NUMERIC,
updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_predictions_parent ON predictions(parent_id);
CREATE INDEX IF NOT EXISTS idx_predictions_creator ON predictions(creator);
CREATE INDEX IF NOT EXISTS idx_predictions_resolved ON predictions(resolved);
