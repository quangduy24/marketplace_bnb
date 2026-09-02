/**
 * Worker: Classification Engine
 * Evaluates agents in the registry and assigns career labels or uncategorized.
 */
import { store } from '../lib/supabase.ts';
import { classifyAgent } from '../lib/classify.ts';

export async function runClassificationWorker() {
  const allAgents = await store.getAllAgents();
  let categorizedCount = 0;
  let uncategorizedCount = 0;

  for (const agent of allAgents) {
    if (agent.labelSource === 'seed') {
      // Keep seed agents untouched (memory fallback mode only)
      continue;
    }

    const classification = classifyAgent(agent.name, agent.description);
    const isUncategorized = classification.labels.includes('uncategorized');

    if (isUncategorized) {
      uncategorizedCount++;
    } else {
      categorizedCount++;
    }

    await store.upsertAgent({
      chainId: agent.chainId,
      agentId: agent.agentId,
      labels: classification.labels,
      labelConfidence: classification.confidence,
      labelEvidence: classification.evidence,
      labelSource: 'rule',
    });
  }

  return { categorizedCount, uncategorizedCount };
}
