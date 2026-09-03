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
    const c = postgres(cs, { prepare: false, max: isVercel ? 1 : 5 });
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
  getAgents(filterActive?: boolean, category?: string, verifiedOnly?: boolean, includeUncategorized?: boolean): Promise<schema.Agent[]>;
  getAllAgents(): Promise<schema.Agent[]>;
  getAgentById(id: string): Promise<schema.Agent | undefined>;
  countAgents(): Promise<number>;
  upsertAgent(agent: Partial<schema.Agent> & { chainId: number; agentId: string }): Promise<void>;
  getHires(buyer?: string): Promise<schema.Hire[]>;
  getHireById(id: string): Promise<schema.Hire | undefined>;
  addHire(hire: Omit<schema.Hire, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<schema.Hire>;
  updateHire(id: string, updates: Partial<schema.Hire>): Promise<schema.Hire | null>;
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

  async getAgents(filterActive = true, category?: string, verifiedOnly = false, includeUncategorized = false): Promise<schema.Agent[]> {
    const conditions: any[] = [];
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
      // Mặc định ẩn Other/uncategorized — chỉ hiện khi includeUncategorized=true (toggle search ngoài Image 1)
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

  async getHires(buyer?: string): Promise<schema.Hire[]> {
    let query = this.db.select().from(schema.hires).orderBy(desc(schema.hires.createdAt));
    if (buyer) {
      query = query.where(sql`lower(${schema.hires.buyer}) = ${buyer.toLowerCase()}`);
    }
    return await query;
  }

  async getHireById(id: string): Promise<schema.Hire | undefined> {
    const rows = await this.db.select().from(schema.hires).where(eq(schema.hires.id, id)).limit(1);
    return rows[0];
  }

  async addHire(hire: Omit<schema.Hire, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<schema.Hire> {
    const values: any = { ...hire };
    if (hire.id) values.id = hire.id;
    const rows = await this.db.insert(schema.hires).values(values).returning();
    return rows[0];
  }

  async updateHire(id: string, updates: Partial<schema.Hire>): Promise<schema.Hire | null> {
    const values = { ...updates, updatedAt: new Date() };
    const rows = await this.db
      .update(schema.hires)
      .set(values)
      .where(eq(schema.hires.id, id))
      .returning();
    const updated = rows[0];
    if (!updated) return null;

    // Bayesian Thompson update upon completion (mirrors MemoryStore semantics)
    if (updates.state === 'submitted' || updates.state === 'paid') {
      await this.db
        .update(schema.agents)
        .set({
          banditAlpha: sql`${schema.agents.banditAlpha} + 1.0`,
          successCount: sql`${schema.agents.successCount} + 1`,
        })
        .where(eq(schema.agents.agentId, updated.agentId));
    } else if (updates.state === 'rejected' || updates.state === 'expired') {
      await this.db
        .update(schema.agents)
        .set({
          banditBeta: sql`${schema.agents.banditBeta} + 1.0`,
          failureCount: sql`${schema.agents.failureCount} + 1`,
        })
        .where(eq(schema.agents.agentId, updated.agentId));
    }

    return updated;
  }
}

/**
 * In-memory fallback store to ensure zero crash if DATABASE_URL is missing in preview.
 * Only used when Supabase is not configured.
 */
export class MemoryStore implements Store {
  private agents: schema.Agent[] = [];
  private hires: schema.Hire[] = [];

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

  public async getAgents(filterActive = true, category?: string, verifiedOnly = false, includeUncategorized = false): Promise<schema.Agent[]> {
    return this.agents.filter((a) => {
      if (filterActive && !a.active) return false;
      if (verifiedOnly && (!a.reachable || !a.hireable)) return false;
      if (category && category !== 'all') {
        const aliasCat = category === 'rebalancing' ? ['rebalancing', 'monitoring'] : [category];
        if (!a.labels?.some((l) => aliasCat.includes(l))) return false;
      }
      if (!includeUncategorized && a.labels?.includes('uncategorized')) return false;
      // Khi includeUncategorized=true và category==='all' thì hiện cả uncategorized (dùng cho search ngoài)
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

  public async getHires(buyer?: string): Promise<schema.Hire[]> {
    if (buyer) {
      return this.hires.filter((h) => h.buyer.toLowerCase() === buyer.toLowerCase());
    }
    return this.hires;
  }

  public async getHireById(id: string): Promise<schema.Hire | undefined> {
    return this.hires.find((h) => h.id === id);
  }

  public async addHire(hire: Omit<schema.Hire, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<schema.Hire> {
    const id = hire.id || `hire-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const newHire: schema.Hire = {
      ...hire,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.hires.unshift(newHire);
    return newHire;
  }

  public async updateHire(id: string, updates: Partial<schema.Hire>): Promise<schema.Hire | null> {
    const hire = this.hires.find((h) => h.id === id);
    if (!hire) return null;
    Object.assign(hire, updates, { updatedAt: new Date() });

    // Bayesian Thompson update upon completion
    if (updates.state === 'submitted' || updates.state === 'paid') {
      const agent = this.agents.find((a) => a.agentId === hire.agentId);
      if (agent) {
        agent.banditAlpha += 1.0;
        agent.successCount += 1;
      }
    } else if (updates.state === 'rejected' || updates.state === 'expired') {
      const agent = this.agents.find((a) => a.agentId === hire.agentId);
      if (agent) {
        agent.banditBeta += 1.0;
        agent.failureCount += 1;
      }
    }

    return hire;
  }
}

const memoryStore = new MemoryStore();

/**
 * Unified data store: real Supabase when configured, in-memory fallback otherwise.
 */
export const store: Store = db ? new SqlStore(db) : memoryStore;
