import { pgTable, text, integer, boolean, real, jsonb, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const agents = pgTable('agents', {
  chainId: integer('chain_id').notNull(),
  agentId: text('agent_id').notNull(),
  tokenId: text('token_id'),
  owner: text('owner'),
  name: text('name'),
  description: text('description'),
  imageUrl: text('image_url'),
  agentUri: text('agent_uri'),
  supportedProtocols: text('supported_protocols').array(),
  x402Supported: boolean('x402_supported').default(false),
  labels: text('labels').array(), // ['monitoring', 'grid', 'health_factor', 'yield', 'uncategorized']
  labelConfidence: real('label_confidence').default(1.0),
  labelEvidence: jsonb('label_evidence'),
  labelSource: text('label_source').default('rule'), // 'rule' | 'seed'
  status: text('status').default('registered'),
  active: boolean('active').default(false),
  reachable: boolean('reachable').default(false),
  hireable: boolean('hireable').default(false),
  rawJson: jsonb('raw_json'),
  // Fields for Bayesian Thompson Sampling Ranking
  banditAlpha: real('bandit_alpha').default(1.0).notNull(),
  banditBeta: real('bandit_beta').default(1.0).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    pk: sql`PRIMARY KEY (${table.chainId}, ${table.agentId})`,
  };
});

export const hires = pgTable('hires', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyer: text('buyer').notNull(),
  chainId: integer('chain_id').notNull(),
  agentId: text('agent_id').notNull(),
  catalog: text('catalog').notNull(),
  rail: text('rail').notNull(), // 'x402' | 'erc8183'
  jobId: text('job_id'),
  txs: text('txs').array(),
  state: text('state').notNull(), // 'funded' | 'running' | 'submitted' | 'paid' | 'rejected' | 'expired'
  budgetU: numeric('budget_u'),
  artifactUri: text('artifact_uri'),
  lastAction: text('last_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Hire = typeof hires.$inferSelect;
export type NewHire = typeof hires.$inferInsert;
