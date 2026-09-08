import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, count, sql, arrayContains, not } from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import seedData from '../seeds/four-sellers.json' with { type: 'json' };

export function getConnectionString(env?: any): string | undefined {
  // Priority: Hyperdrive binding > Workers env.DATABASE_URL > Node process.env
  try {
    const hyperdriveCs = env?.HYPERDRIVE?.connectionString as string | undefined;
    if (hyperdriveCs) return hyperdriveCs;
  } catch {}
  try {
    const envDb = env?.DATABASE_URL as string | undefined;
    if (envDb) return envDb;
  } catch {}
  try {
    const p = (globalThis as any)?.process?.env?.DATABASE_URL as string | undefined;
    if (p) return p;
  } catch {}
  try {
    if (typeof process !== 'undefined' && (process as any)?.env?.DATABASE_URL) {
      return (process as any).env.DATABASE_URL as string;
    }
  } catch {}
  return undefined;
}

export function createDb(env?: any) {
  const cs = getConnectionString(env);
  if (!cs) {
    console.log('[Supabase] DATABASE_URL / HYPERDRIVE not set. Running in resilient mock/local store with seed agents.');
    return { client: null, db: null };
  }
  try {
    const isVercel = !!(process as any)?.env?.VERCEL || !!env?.VERCEL;
    const c = postgres(cs, {
      prepare: false,
      max: isVercel ? 1 : 10,
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Timeout connection establishment after 10 seconds
      max_lifetime: 60 * 10, // Recycle connections after 10 minutes to prevent socket leaks
    });
    const d = drizzle(c, { schema });
    console.log('[Supabase] Initialized via', env?.HYPERDRIVE ? 'Hyperdrive' : 'postgres.js Transaction Pooler');
    return { client: c, db: d };
  } catch (err) {
    console.warn('[Supabase] Failed connecting to postgres, using in-memory agent cache:', err);
    return { client: null, db: null };
  }
}

// Eager init for Node (local dev / `node dist/server.cjs`) — uses process.env
const _init = createDb();
export let client: any = _init.client;
export let db: any = _init.db;

export interface Store {
  getAgents(filterActive?: boolean, category?: string, verifiedOnly?: boolean, includeUncategorized?: boolean, chainId?: number): Promise<schema.Agent[]>;
  getAllAgents(): Promise<schema.Agent[]>;
  getAgentById(id: string): Promise<schema.Agent | undefined>;
  countAgents(): Promise<number>;
  upsertAgent(agent: Partial<schema.Agent> & { chainId: number; agentId: string }): Promise<void>;
}

/**
 * SQL-backed store for Supabase / Postgres via drizzle.
 * All reads/writes hit the real database.
 */
export class SqlStore implements Store {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async getAgents(filterActive = true, category?: string, verifiedOnly = false, includeUncategorized = false, chainId = 56): Promise<schema.Agent[]> {
    const conditions: any[] = [];
    if (chainId) {
      conditions.push(eq(schema.agents.chainId, chainId));
    }
    if (filterActive) {
      conditions.push(eq(schema.agents.active, true));
    }
    if (verifiedOnly) {
      conditions.push(eq(schema.agents.reachable, true));
      conditions.push(eq(schema.agents.hireable, true));
    }
    if (category && category !== 'all') {
      if (category === 'rebalancing') {
        // Legacy alias: old rows still have 'monitoring'
        conditions.push(sql`(${schema.agents.labels} @> ARRAY['rebalancing']::text[] OR ${schema.agents.labels} @> ARRAY['monitoring']::text[])`);
      } else if (category === 'uncategorized') {
        conditions.push(arrayContains(schema.agents.labels, ['uncategorized']));
      } else {
        conditions.push(arrayContains(schema.agents.labels, [category]));
      }
    }
    if (!includeUncategorized) {
      // Default: exclude uncategorized agents unless includeUncategorized is explicitly true
      if (category !== 'uncategorized') {
        conditions.push(not(arrayContains(schema.agents.labels, ['uncategorized'])));
      }
    }
    return await this.db
      .select()
      .from(schema.agents)
      .where(and(...conditions))
      .orderBy(desc(schema.agents.updatedAt));
  }

  async getAllAgents(): Promise<schema.Agent[]> {
    return await this.db.select().from(schema.agents);
  }

  async getAgentById(id: string): Promise<schema.Agent | undefined> {
    const rows = await this.db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.agentId, id))
      .limit(1);
    return rows[0];
  }

  async countAgents(): Promise<number> {
    const rows = await this.db.select({ n: count() }).from(schema.agents);
    return Number(rows[0]?.n ?? 0);
  }

  async upsertAgent(agent: Partial<schema.Agent> & { chainId: number; agentId: string }): Promise<void> {
    const existing = await this.db
      .select()
      .from(schema.agents)
      .where(and(eq(schema.agents.chainId, agent.chainId), eq(schema.agents.agentId, agent.agentId)))
      .limit(1);

    const merged = {
      ...existing[0],
      ...agent,
      updatedAt: new Date(),
    };

    await this.db
      .insert(schema.agents)
      .values(merged)
      .onConflictDoUpdate({
        target: [schema.agents.chainId, schema.agents.agentId],
        set: merged,
      });
  }
}

/**
 * In-memory fallback store to ensure zero crash if DATABASE_URL is missing in preview.
 * Only used when Supabase is not configured.
 */
export class MemoryStore implements Store {
  private agents: schema.Agent[] = [];

  constructor() {
    this.seedAgents();
  }

  public seedAgents() {
    this.agents = seedData.map((s: any) => ({
      chainId: s.chainId,
      agentId: s.agentId,
      tokenId: s.tokenId,
      owner: s.owner,
      name: s.name,
      description: s.description,
      imageUrl: s.imageUrl,
      agentUri: s.agentUri,
      supportedProtocols: s.supportedProtocols,
      x402Supported: s.x402Supported,
      labels: s.labels,
      labelConfidence: s.labelConfidence,
      labelEvidence: s.labelEvidence,
      labelSource: s.labelSource,
      status: s.status,
      active: s.active,
      reachable: s.reachable,
      hireable: s.hireable,
      banditAlpha: s.banditAlpha,
      banditBeta: s.banditBeta,
      successCount: s.successCount,
      failureCount: s.failureCount,
      rawJson: s.rawJson,
      updatedAt: new Date(),
    }));
  }

  public async getAgents(filterActive = true, category?: string, verifiedOnly = false, includeUncategorized = false, chainId = 56): Promise<schema.Agent[]> {
    return this.agents.filter((a) => {
      if (chainId && a.chainId !== chainId) return false;
      if (filterActive && !a.active) return false;
      if (verifiedOnly && (!a.reachable || !a.hireable)) return false;
      if (category && category !== 'all') {
        const aliasCat = category === 'rebalancing' ? ['rebalancing', 'monitoring'] : [category];
        if (!a.labels?.some((l) => aliasCat.includes(l))) return false;
      }
      if (!includeUncategorized && a.labels?.includes('uncategorized')) return false;
      // When includeUncategorized is true and category === 'all', keep uncategorized agents as well
      if (includeUncategorized && category === 'uncategorized' && !a.labels?.includes('uncategorized')) return false;
      return true;
    });
  }

  public async getAllAgents(): Promise<schema.Agent[]> {
    return this.agents;
  }

  public async getAgentById(id: string): Promise<schema.Agent | undefined> {
    return this.agents.find((a) => a.agentId === id);
  }

  public async countAgents(): Promise<number> {
    return this.agents.length;
  }

  public async upsertAgent(agent: Partial<schema.Agent> & { chainId: number; agentId: string }): Promise<void> {
    const idx = this.agents.findIndex((a) => a.chainId === agent.chainId && a.agentId === agent.agentId);
    if (idx >= 0) {
      this.agents[idx] = { ...this.agents[idx], ...agent, updatedAt: new Date() } as schema.Agent;
    } else {
      this.agents.push({
        tokenId: null,
        owner: null,
        name: null,
        description: null,
        imageUrl: null,
        agentUri: null,
        supportedProtocols: [],
        x402Supported: false,
        labels: ['uncategorized'],
        labelConfidence: 1.0,
        labelEvidence: null,
        labelSource: 'rule',
        status: 'registered',
        active: false,
        reachable: false,
        hireable: false,
        banditAlpha: 1.0,
        banditBeta: 1.0,
        successCount: 0,
        failureCount: 0,
        rawJson: null,
        updatedAt: new Date(),
        ...agent,
      } as schema.Agent);
    }
  }
}

const memoryStore = new MemoryStore();

/**
 * Unified data store: real Supabase when configured, in-memory fallback otherwise.
 */
export const store: Store = db ? new SqlStore(db) : memoryStore;
