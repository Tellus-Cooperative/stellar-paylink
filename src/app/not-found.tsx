import "./not-found.css";

export default function NotFound() {
  return (
    <main className="not-found">
      <video
        className="not-found__video"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4"
          type="video/mp4"
        />
      </video>

      <div className="not-found__brand" role="img" aria-label="Paylink">
        <svg viewBox="0 0 54 40" fill="none" aria-hidden="true">
          <path d="M38 0H26V12H38V0Z" fill="white" />
          <path d="M54 12H38V28H54V12Z" fill="white" />
          <path d="M38 28H26V40H38V28Z" fill="white" />
          <path d="M26 12H16V22H26V12Z" fill="white" />
          <path d="M16 22H8V30H16V22Z" fill="white" />
          <path d="M16 2H6V12H16V2Z" fill="white" />
          <path d="M6 12H0V18H6V12Z" fill="white" />
        </svg>
        <span className="not-found__brand-name">PAYLINK</span>
      </div>

      <div className="not-found__content">
        <h1 className="not-found__num">404</h1>
        <hr className="not-found__divider" />
        <p className="not-found__msg">
          The path may be broken, but the journey isn&apos;t. Let&apos;s get you
          back.
        </p>
      </div>
    </main>
  );
}