import { keccak256, toHex, type Hex } from 'viem';

/**
 * Canonical JSON serialization as defined by @altananetwork/sdk and @bnbagent/sdk:
 * - Keys recursively sorted at every level
 * - Compact separators (",", ":")
 * - Non-ASCII characters escaped as \uXXXX (matches Python json.dumps ensure_ascii=True)
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value)).replace(
    /[\u007f-\uffff]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}

function sortValue(v: any): any {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) {
      out[k] = sortValue(v[k]);
    }
    return out;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) {
    throw new Error(`canonicalJson: non-finite number: ${v}`);
  }
  return v;
}

/**
 * Compute the on-chain deliverable hash: keccak256 of canonical manifest text.
 */
export function erc8183ManifestHash(manifest: Record<string, any>): Hex {
  const text = canonicalJson(manifest);
  return keccak256(toHex(text));
}

/**
 * Buyer-side integrity check: hashes the RAW fetched text against the on-chain deliverable hash.
 */
export function verifyErc8183ManifestText(rawText: string, onChainDeliverable: string): boolean {
  if (!rawText || !onChainDeliverable) return false;
  const computedHash = keccak256(toHex(rawText)).toLowerCase();
  return computedHash === onChainDeliverable.toLowerCase();
}
