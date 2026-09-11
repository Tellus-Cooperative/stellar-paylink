export const MAX_DECIMALS = 7;

const MAX_STROOPS = 9_223_372_036_854_775_807n;

const AMOUNT_RE = /^([0-9]+)(?:\.([0-9]{1,7}))?$/;

export type AmountParse =
  | { ok: true; normalized: string; stroops: bigint }
  | { ok: false; code: "AMOUNT_INVALID" };

function trimIntegerPart(input: string): string {
  const withoutLeadingZeros = input.replace(/^0+(?=\d)/, "");
  return withoutLeadingZeros;
}

export function parseAmount(input: string): AmountParse {
  const match = AMOUNT_RE.exec(input);
  if (!match) {
    return { ok: false, code: "AMOUNT_INVALID" };
  }
  const intPart = trimIntegerPart(match[1] ?? "");
  const fracPart = match[2] ?? "";
  const intPartValue = BigInt(intPart);
  if (intPartValue > MAX_STROOPS) {
    return { ok: false, code: "AMOUNT_INVALID" };
  }
  const fracPadded = fracPart.padEnd(MAX_DECIMALS, "0");
  const fracValue = fracPadded.length > 0 ? BigInt(fracPadded) : 0n;
  const stroops = intPartValue * 10n ** BigInt(MAX_DECIMALS) + fracValue;
  if (stroops <= 0n || stroops > MAX_STROOPS) {
    return { ok: false, code: "AMOUNT_INVALID" };
  }
  const fracTrimmed = fracPart.replace(/0+$/, "");
  const normalized = fracTrimmed.length > 0 ? `${intPart}.${fracTrimmed}` : intPart;
  return { ok: true, normalized, stroops };
}

export function formatStroops(stroops: bigint): string {
  const abs = stroops < 0n ? -stroops : stroops;
  const whole = abs / 10n ** BigInt(MAX_DECIMALS);
  const frac = (abs % 10n ** BigInt(MAX_DECIMALS)).toString().padStart(MAX_DECIMALS, "0");
  const fracTrimmed = frac.replace(/0+$/, "");
  return `${whole.toString()}${fracTrimmed.length > 0 ? `.${fracTrimmed}` : ""}`;
}

export function sameAmount(a: string, b: string): boolean {
  const pa = parseAmount(a);
  const pb = parseAmount(b);
  if (!pa.ok || !pb.ok) {
    return false;
  }
  return pa.stroops === pb.stroops;
}