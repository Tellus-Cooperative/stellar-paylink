import { StrKey } from "@stellar/stellar-sdk";

export function isStellarPublicAddress(value: string): boolean {
  return StrKey.isValidEd25519PublicKey(value);
}

export function isMuxedAccount(value: string): boolean {
  return StrKey.isValidMed25519PublicKey(value);
}

export type AddressValidation =
  | { ok: true; address: string }
  | { ok: false; code: "INVALID_DESTINATION" };

export function validateDestination(value: string): AddressValidation {
  if (!isStellarPublicAddress(value)) {
    return { ok: false, code: "INVALID_DESTINATION" };
  }
  return { ok: true, address: value };
}

export function isSameAddress(a: string, b: string): boolean {
  return a === b;
}