/**
 * Passkey wallet vault — tracks the throwaway passkey wallets created per hire
 * so stranded funds (e.g. $U left after a failed hire) can be recovered later.
 *
 * Only the passkey CREDENTIAL is stored ({ kind, id, publicKey, rpId }),
 * which is JSON-safe by SDK design. No private keys, no seeds — spending still
 * requires a biometric assertion on this computer for every withdrawal.
 * Browser localStorage only; never leaves the device.
 */
import type { BscNetwork } from './wallet.ts';

export interface PasskeyRecord {
  address: string;
  credential: unknown;
  network: BscNetwork;
  agentId?: string | null;
  createdAt: string;
}

const STORAGE_KEY = 'bnb_passkey_vault_v1';

function readAll(): PasskeyRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PasskeyRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: PasskeyRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage full or unavailable — tracking is best-effort, never blocks hires.
  }
}

export function savePasskeyRecord(record: PasskeyRecord): void {
  const all = readAll().filter((r) => r.address.toLowerCase() !== record.address.toLowerCase());
  all.unshift(record);
  writeAll(all.slice(0, 50));
}

export function listPasskeyRecords(network?: BscNetwork): PasskeyRecord[] {
  const all = readAll();
  return network ? all.filter((r) => r.network === network) : all;
}

export function removePasskeyRecord(address: string): void {
  writeAll(readAll().filter((r) => r.address.toLowerCase() !== address.toLowerCase()));
}
