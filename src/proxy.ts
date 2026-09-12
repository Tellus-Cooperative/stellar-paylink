import { NextResponse } from "next/server";

function horizonOrigin(): string | null {
  const raw = process.env.STELLAR_HORIZON_URL?.trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(): string {
  const connectSources = ["'self'", "https://horizon-testnet.stellar.org"];
  const horizon = horizonOrigin();
  if (horizon && !connectSources.includes(horizon)) {
    connectSources.push(horizon);
  }
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    // Next.js App Router emits inline scripts; strict nonces are a later
    // hardening step. External scripts stay blocked.
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${connectSources.join(" ")}`,
    "img-src 'self' data: blob:",
    "media-src 'self' https://d8j0ntlcm91z4.cloudfront.net",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default function proxy(): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", contentSecurityPolicy());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains"
  );
  return response;
}
