/**
 * Bayesian Thompson Sampling for AI Agent Cold-Start & Exploration/Exploitation Ranking.
 * Draws Beta(alpha, beta) samples using Marsaglia and Tsang's Gamma method.
 */

/**
 * Standard Normal distribution sampler using Box-Muller transform
 */
function sampleStandardNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Marsaglia and Tsang (2000) Gamma distribution generator Gamma(shape, 1)
 */
export function sampleGamma(shape: number): number {
  if (shape < 1.0) {
    // For shape < 1, use property Gamma(shape) = Gamma(shape + 1) * U^(1 / shape)
    const u = Math.random();
    return sampleGamma(shape + 1.0) * Math.pow(u, 1.0 / shape);
  }

  const d = shape - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);

  while (true) {
    let z = sampleStandardNormal();
    let v = 1.0 + c * z;
    if (v <= 0) continue;
    v = v * v * v;
    const u = Math.random();

    // Squeeze test
    if (u < 1.0 - 0.0331 * z * z * z * z) {
      return d * v;
    }
    // Full test
    if (Math.log(u) < 0.5 * z * z + d * (1.0 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Beta distribution sampler: Beta(alpha, beta) = Gamma(alpha) / (Gamma(alpha) + Gamma(beta))
 */
export function sampleBeta(alpha: number, beta: number): number {
  const safeAlpha = Math.max(0.1, alpha);
  const safeBeta = Math.max(0.1, beta);

  const x = sampleGamma(safeAlpha);
  const y = sampleGamma(safeBeta);

  if (x + y === 0) return 0.5;
  return x / (x + y);
}

/**
 * Calculates Bandit Score for an agent
 */
export function computeBanditScore(alpha: number, beta: number): number {
  return sampleBeta(alpha, beta);
}
