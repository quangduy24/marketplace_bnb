/**
 * Relay quote parsing — pure helpers, no RPC, no UI.
 *
 * The Altana/Porto relay answers wallet_prepareCalls with a quote shaped as:
 *   { quotes: [{ assetDeficits: [{ address, required, deficit, ... }], feeTokenDeficit, ... }] }
 * where a null asset address represents the native token (tBNB/BNB).
 * Older/alternate responses may carry a flat { assetDeficits } object instead.
 *
 * Every amount parsed here originates from a live RPC response — these
 * functions never invent numbers, they only sum what the relay reported.
 */

export const NATIVE_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function isZeroAddress(addr: string | null | undefined): boolean {
  return !addr || addr.toLowerCase() === NATIVE_ZERO_ADDRESS.toLowerCase();
}

// Sum the `required` of native-token entries in one assetDeficits array.
export function sumNativeRequiredWei(assetDeficits: any[] | undefined | null): bigint {
  if (!Array.isArray(assetDeficits)) return 0n;
  let total = 0n;
  for (const d of assetDeficits) {
    if (isZeroAddress(d?.address) && d?.required !== undefined && d?.required !== null) {
      total += BigInt(d.required);
    }
  }
  return total;
}

// Total native funding a relay quote demands across all quotes.
// NOTE: only assetDeficits[].required counts — feeTokenDeficit/deficit is the
// *remaining shortfall* given the wallet's current balance, not an extra
// charge. Summing both would double-count and over-fund.
export function sumQuoteRequiredWei(quoteRoot: any): bigint {
  const quoteList = Array.isArray(quoteRoot?.quotes)
    ? quoteRoot.quotes
    : quoteRoot?.assetDeficits
      ? [quoteRoot]
      : [];
  let required = 0n;
  for (const q of quoteList) {
    required += sumNativeRequiredWei(q?.assetDeficits);
  }
  return required;
}

// Extract the relay's demanded native total from a failed
// wallet_sendPreparedCalls error message. The relay SDK embeds the full
// request body (including context.quote) in the thrown message, so the exact
// required amount is recoverable as pure RPC data — no estimation.
// Returns 0n when the body cannot be found or parsed.
export function parseRelayRequiredWeiFromMessage(message: string | null | undefined): bigint {
  if (!message) return 0n;
  const marker = 'Request body:';
  const idx = message.indexOf(marker);
  if (idx < 0) return 0n;
  let jsonText = message.slice(idx + marker.length).trim();
  // The message may append "\n\nDetails: ..." after the JSON body.
  const detailsIdx = jsonText.search(/\n\s*\nDetails:/);
  if (detailsIdx >= 0) jsonText = jsonText.slice(0, detailsIdx).trim();
  try {
    const body = JSON.parse(jsonText);
    const params = Array.isArray(body?.params) ? body.params : [];
    let total = 0n;
    for (const p of params) {
      total += sumQuoteRequiredWei(p?.context?.quote);
    }
    return total;
  } catch {
    return 0n;
  }
}
