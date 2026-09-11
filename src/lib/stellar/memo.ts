import { randomBytes } from "node:crypto";

export const MEMO_MAX_BYTES = 28;

const MEMO_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomReference(length = 14): string {
  if (length < 1) {
    throw new Error("Memo reference length must be at least 1");
  }
  const bytes = randomBytes(length);
  let ref = "";
  for (let i = 0; i < length; i += 1) {
    ref += MEMO_ALPHABET[bytes[i] % MEMO_ALPHABET.length];
  }
  return ref;
}

export function generateMemoReference(): string {
  return `PL${randomReference(14)}`;
}

export function memoFitsConstraints(memo: string): boolean {
  return /^[A-Za-z0-9]+$/.test(memo) && Buffer.byteLength(memo, "utf8") <= MEMO_MAX_BYTES;
}