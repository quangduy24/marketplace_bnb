/**
 * Rule-based local keyword classifier for ERC-8004 AI Agents.
 * Strict categories: 'monitoring' | 'grid' | 'health_factor' | 'yield' | 'uncategorized'
 */

export type CareerCategory = 'monitoring' | 'grid' | 'health_factor' | 'yield' | 'uncategorized';

export const CAREER_KEYWORDS: Record<Exclude<CareerCategory, 'uncategorized'>, string[]> = {
  monitoring: ['monitor', 'watch', 'alert', 'track wallet', 'position', 'whale'],
  grid: ['grid', 'range trading', 'dca', 'limit ladder'],
  health_factor: ['health factor', 'liquidation', 'ltv', 'collateral', 'venus', 'aave'],
  yield: ['yield', 'apy', 'vault', 'farm', 'harvest', 'allocate'],
};

export interface ClassificationResult {
  labels: CareerCategory[];
  confidence: number;
  evidence: {
    matchedKeywords: Record<string, string[]>;
  };
}

export function classifyAgent(name?: string | null, description?: string | null): ClassificationResult {
  const text = `${name || ''} ${description || ''}`.toLowerCase();
  const matchedCategories: Record<string, string[]> = {};

  for (const [category, keywords] of Object.entries(CAREER_KEYWORDS)) {
    const hits: string[] = [];
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        hits.push(kw);
      }
    }
    if (hits.length > 0) {
      matchedCategories[category] = hits;
    }
  }

  const detectedLabels = Object.keys(matchedCategories) as CareerCategory[];

  if (detectedLabels.length === 0) {
    return {
      labels: ['uncategorized'],
      confidence: 1.0,
      evidence: { matchedKeywords: {} },
    };
  }

  // Calculate confidence based on keyword matches
  const totalMatches = Object.values(matchedCategories).reduce((sum, arr) => sum + arr.length, 0);
  const confidence = Math.min(1.0, 0.6 + totalMatches * 0.1);

  return {
    labels: detectedLabels,
    confidence,
    evidence: { matchedKeywords: matchedCategories },
  };
}

/**
 * 5 Unit tests covering 4 career categories + 1 uncategorized
 */
export function runClassificationUnitTests(): { passed: boolean; testResults: Array<{ name: string; expected: string; actual: string[]; ok: boolean }> } {
  const tests = [
    {
      name: 'Test Monitoring: Whale watcher and wallet tracker',
      input: { name: 'WhaleSentinel', desc: 'Real-time alert on large position and track wallet movements' },
      expected: 'monitoring',
    },
    {
      name: 'Test Grid: Automated DCA limit ladder bot',
      input: { name: 'PancakeGrid', desc: 'Automated range trading with geometric limit ladder and DCA logic' },
      expected: 'grid',
    },
    {
      name: 'Test Health Factor: Venus liquidation prevention',
      input: { name: 'VenusShield', desc: 'Monitors loan LTV collateral and prevents health factor liquidation' },
      expected: 'health_factor',
    },
    {
      name: 'Test Yield: APY vault harvesting agent',
      input: { name: 'HarvestPro', desc: 'Autonomous APY vault allocator that farms and harvests liquidity yields' },
      expected: 'yield',
    },
    {
      name: 'Test Uncategorized: Generic text without career keywords',
      input: { name: 'ChatBot42', desc: 'Just a casual chatbot greeting people in general language' },
      expected: 'uncategorized',
    },
  ];

  const testResults = tests.map((t) => {
    const res = classifyAgent(t.input.name, t.input.desc);
    const ok = res.labels.includes(t.expected as CareerCategory);
    return {
      name: t.name,
      expected: t.expected,
      actual: res.labels,
      ok,
    };
  });

  const passed = testResults.every((r) => r.ok);
  return { passed, testResults };
}
