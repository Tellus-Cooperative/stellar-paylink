"use client";

import { useEffect, useRef, useState } from "react";

export default function BrandMark() {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete) setLoaded(true);
  }, []);

  return (
    <a
      className={`paylink__brand${loaded ? " is-loaded" : ""}`}
      href="https://telluscoop.org/"
      aria-label="Tellus Cooperative"
    >
      {!loaded && (
        <span className="paylink__brand-fallback" aria-hidden>
          T
        </span>
      )}
      <img
        ref={ref}
        src="/tellus-icon.png"
        alt=""
        onLoad={() => setLoaded(true)}
      />
    </a>
  );
}