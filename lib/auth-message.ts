/**
 * Wallet identity verification message — shared by client (signing) and server (verifying).
 * The exact same string must be used on both sides.
 */
export const AUTH_MESSAGE_PREFIX =
  'LANS — Autonomous Agent Sanctuary (Agent Villa)\nI am connecting my wallet to this platform.\n';

export function buildVerificationMessage(wallet: string, chainId: number): string {
  return (
    `${AUTH_MESSAGE_PREFIX}` +
    `Wallet: ${wallet}\n` +
    `Chain: BNB Smart Chain (${chainId})\n` +
    'This signature costs no gas and authorizes no transactions.'
  );
}
