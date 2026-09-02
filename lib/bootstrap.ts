/**
 * Supabase schema bootstrap.
 * Creates the agents and hires tables if they do not exist yet.
 * Uses raw SQL through drizzle's db.execute() — no migration tooling required.
 */
import { sql } from 'drizzle-orm';

const DDL = sql`
CREATE TABLE IF NOT EXISTS agents (
  chain_id integer NOT NULL,
  agent_id text NOT NULL,
  token_id text,
  owner text,
  name text,
  description text,
  image_url text,
  agent_uri text,
  supported_protocols text[],
  x402_supported boolean DEFAULT false,
  labels text[],
  label_confidence real DEFAULT 1.0,
  label_evidence jsonb,
  label_source text DEFAULT 'rule',
  status text DEFAULT 'registered',
  active boolean DEFAULT false,
  reachable boolean DEFAULT false,
  hireable boolean DEFAULT false,
  raw_json jsonb,
  bandit_alpha real DEFAULT 1.0 NOT NULL,
  bandit_beta real DEFAULT 1.0 NOT NULL,
  success_count integer DEFAULT 0 NOT NULL,
  failure_count integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (chain_id, agent_id)
);

CREATE TABLE IF NOT EXISTS hires (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer text NOT NULL,
  chain_id integer NOT NULL,
  agent_id text NOT NULL,
  catalog text NOT NULL,
  rail text NOT NULL,
  job_id text,
  txs text[],
  state text NOT NULL,
  budget_u numeric,
  artifact_uri text,
  last_action text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
`;

export async function ensureSchema(db: any): Promise<void> {
  if (!db) return;
  await db.execute(DDL);
}
