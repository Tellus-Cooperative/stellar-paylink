import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_NETWORK"
  | "UNSUPPORTED_ASSET"
  | "INVALID_DESTINATION"
  | "AMOUNT_INVALID"
  | "DESTINATION_NOT_READY"
  | "NOT_FOUND"
  | "EXPIRED"
  | "ALREADY_PAID"
  | "TRANSACTION_INVALID"
  | "TRANSACTION_NOT_FOUND"
  | "MEMO_MISMATCH"
  | "PAYMENT_MISMATCH"
  | "OUTSIDE_PAYMENT_WINDOW"
  | "HASH_ALREADY_USED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message, ...extra } },
    { status }
  );
}

export function toApiError(error: unknown): {
  code: ApiErrorCode;
  message: string;
  status: number;
} {
  if (typeof error === "string") {
    return { code: "INTERNAL_ERROR", message: error, status: 500 };
  }
  return {
    code: "INTERNAL_ERROR",
    message: "Unexpected server error",
    status: 500,
  };
}