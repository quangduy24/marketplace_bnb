/**
 * Worker: Classification Engine
 * Evaluates agents in the registry and assigns career labels or uncategorized.
 */
import { memoryStore } from '../lib/supabase.ts';
import { classifyAgent } from '../lib/classify.ts';

export async function runClassificationWorker() {
  const allAgents = memoryStore.getAllAgents();
  let categorizedCount = 0;
  let uncategorizedCount = 0;

  for (const agent of allAgents) {
    if (agent.labelSource === 'seed') {
      // Keep seed agents untouched
      continue;
    }

    const classification = classifyAgent(agent.name, agent.description);
    const isUncategorized = classification.labels.includes('uncategorized');

    if (isUncategorized) {
      uncategorizedCount++;
    } else {
      categorizedCount++;
    }

    memoryStore.upsertAgent({
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
