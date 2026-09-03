/**
 * Worker: Classification Engine
 * Evaluates agents in the registry and assigns career labels or uncategorized.
 * Honors on-chain indexer tags first (TAG_CATEGORY_MAP), falling back to keyword taxonomy.
 */
import { store } from '../lib/supabase.ts';
import { classifyAgent, CareerCategory } from '../lib/classify.ts';
import { TAG_CATEGORY_MAP } from '../lib/8004scan.ts';

export async function runClassificationWorker() {
  const allAgents = await store.getAllAgents();
  let categorizedCount = 0;
  let uncategorizedCount = 0;

  const CHUNK_SIZE = 25;
  for (let i = 0; i < allAgents.length; i += CHUNK_SIZE) {
    const chunk = allAgents.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (agent) => {
        if (agent.labelSource === 'seed') {
          // Keep seed agents untouched
          return;
        }

        // 1. Check indexer tags first
        const rawTags: string[] = (agent.rawJson as any)?.tags || [];
        const tagLabels = new Set<CareerCategory>();
        for (const t of rawTags) {
          const cat = TAG_CATEGORY_MAP[t.toLowerCase()];
          if (cat) tagLabels.add(cat);
        }

        let labels: CareerCategory[];
        let confidence: number;
        let evidence: any;

        if (tagLabels.size > 0) {
          labels = Array.from(tagLabels);
          confidence = 0.85;
          evidence = { matchedTags: rawTags };
        } else {
          // 2. Fallback to keyword classifier
          const classification = classifyAgent(agent.name, agent.description);
          labels = classification.labels;
          confidence = classification.confidence;
          evidence = classification.evidence;
        }

        const isUncategorized = labels.includes('uncategorized');
        if (isUncategorized) {
          uncategorizedCount++;
        } else {
          categorizedCount++;
        }

        await store.upsertAgent({
          chainId: agent.chainId,
          agentId: agent.agentId,
          labels,
          labelConfidence: confidence,
          labelEvidence: evidence,
          labelSource: 'rule',
        });
      })
    );
  }

  return { categorizedCount, uncategorizedCount };
}
