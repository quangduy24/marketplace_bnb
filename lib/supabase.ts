import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema.ts';
import seedData from '../seeds/four-sellers.json' with { type: 'json' };

const connectionString = process.env.DATABASE_URL;

export let client: any = null;
export let db: any = null;

if (connectionString) {
  try {
    // Transaction pooler optimized for Serverless / Edge (port 6543)
    client = postgres(connectionString, { prepare: false, max: 5 });
    db = drizzle(client, { schema });
    console.log('[Supabase] Initialized Transaction Pooler via postgres.js');
  } catch (err) {
    console.warn('[Supabase] Failed connecting to postgres directly, using in-memory agent cache:', err);
  }
} else {
  console.log('[Supabase] DATABASE_URL not set. Running in resilient mock/local store with seed agents.');
}

// In-memory memory fallback store to ensure zero crash if DATABASE_URL is missing in preview
export class MemoryStore {
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

  public getAgents(filterActive = true, category?: string): schema.Agent[] {
    return this.agents.filter((a) => {
      if (filterActive && (!a.active || !a.reachable || !a.hireable)) return false;
      if (category && category !== 'all' && !a.labels?.includes(category)) return false;
      // Do not include uncategorized in marketplace
      if (a.labels?.includes('uncategorized')) return false;
      return true;
    });
  }

  public getAllAgents(): schema.Agent[] {
    return this.agents;
  }

  public getAgentById(id: string): schema.Agent | undefined {
    return this.agents.find((a) => a.agentId === id);
  }

  public upsertAgent(agent: Partial<schema.Agent> & { chainId: number; agentId: string }) {
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

  public getHires(buyer?: string): schema.Hire[] {
    if (buyer) {
      return this.hires.filter((h) => h.buyer.toLowerCase() === buyer.toLowerCase());
    }
    return this.hires;
  }

  public getHireById(id: string): schema.Hire | undefined {
    return this.hires.find((h) => h.id === id);
  }

  public addHire(hire: Omit<schema.Hire, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): schema.Hire {
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

  public updateHire(id: string, updates: Partial<schema.Hire>): schema.Hire | null {
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

export const memoryStore = new MemoryStore();
