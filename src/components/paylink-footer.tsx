"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const FOOTER_NAV: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Learn",
    links: [
      { label: "Stellar Ambassador", href: "https://stellar.telluscoop.com" },
      { label: "Intro to Blockchain", href: "https://blog.telluscoop.com/t/cursos" },
      { label: "Practical guides", href: "https://blog.telluscoop.com/t/blockchain" },
      { label: "AI tools", href: "https://blog.telluscoop.com/t/ia" },
    ],
  },
  {
    title: "Channels",
    links: [
      { label: "Blockchain", href: "https://blog.telluscoop.com/t/blockchain" },
      { label: "AI", href: "https://blog.telluscoop.com/t/ia" },
      { label: "Entrepreneurship", href: "https://blog.telluscoop.com/t/emprendimiento" },
      { label: "Courses", href: "https://blog.telluscoop.com/t/cursos" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: "https://github.com/Tellus-Cooperative" },
      { label: "Events", href: "https://luma.com/telluscoop" },
      { label: "Discord", href: "https://discord.gg/V4eSGWA3PK" },
      { label: "YouTube", href: "https://youtube.com/@telluscoop" },
    ],
  },
];

const SOCIALS: { label: string; href: string; d: string }[] = [
  {
    label: "GitHub",
    href: "https://github.com/Tellus-Cooperative",
    d: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  {
    label: "X",
    href: "https://x.com/telluscoop",
    d: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/telluscoop",
    d: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0Zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03Zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162ZM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4Zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439Z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/Tellus-Cooperative",
    d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065Zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z",
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@telluscoop",
    d: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z",
  },
  {
    label: "Discord",
    href: "https://discord.gg/V4eSGWA3PK",
    d: "M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.291.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  },
];

/*
 * The glow is fixed to the bottom of the viewport, so on its own it would sit
 * over the page content at full height. On the landing page it is revealed by
 * scroll: it stays a sliver until the document bottom comes into view. Keep the
 * same reveal here, otherwise the gradient covers the form.
 */
const MIN_REVEAL = 0.045;

export default function PaylinkFooter() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      glow.style.transform = "scaleY(1)";
      return;
    }

    let rendered: number | null = null;
    const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

    const measure = () => {
      const height = glow.offsetHeight || 1;
      const left =
        document.documentElement.scrollHeight -
        window.innerHeight -
        window.scrollY;
      const progress =
        MIN_REVEAL + (1 - MIN_REVEAL) * clamp01((height - left) / height);
      if (rendered === progress) return;
      rendered = progress;
      glow.style.transform = `scaleY(${progress})`;
      glow.classList.toggle("waves-off", progress < 0.3);
    };

    let scheduled = false;
    const onViewportChange = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", onViewportChange, { passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    return () => {
      window.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, []);

  return (
    <footer className="harelink__foot">
      <div
        className="harelink__glow waves-off"
        ref={glowRef}
        style={{ transform: `scaleY(${MIN_REVEAL})` }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 1271 599" preserveAspectRatio="none" fill="none">
          <defs>
            <linearGradient id="harelink-foot-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#0A2B2C" />
              <stop offset="0.25" stopColor="#175152" />
              <stop offset="0.45" stopColor="#3F8487" />
              <stop offset="0.65" stopColor="#A9C2B4" />
              <stop offset="0.8" stopColor="#ECE0CC" />
              <stop offset="1" stopColor="#ECE0CC00" />
            </linearGradient>
            <filter
              id="harelink-foot-blur"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur stdDeviation="15" />
            </filter>
          </defs>
          <g filter="url(#harelink-foot-blur)">
            <rect x="0" y="276" width="174" height="323" fill="url(#harelink-foot-grad)" />
            <rect x="141" y="197" width="174" height="402" fill="url(#harelink-foot-grad)" />
            <rect x="282" y="124" width="174" height="475" fill="url(#harelink-foot-grad)" />
            <rect x="424" y="59" width="174" height="540" fill="url(#harelink-foot-grad)" />
            <rect x="565" y="12" width="174" height="587" fill="url(#harelink-foot-grad)" />
            <rect x="706" y="59" width="174" height="540" fill="url(#harelink-foot-grad)" />
            <rect x="847" y="124" width="174" height="475" fill="url(#harelink-foot-grad)" />
            <rect x="988" y="197" width="174" height="402" fill="url(#harelink-foot-grad)" />
            <rect x="1130" y="276" width="174" height="323" fill="url(#harelink-foot-grad)" />
          </g>
        </svg>
      </div>

      <div className="harelink__foot-inner">
        <div className="harelink__foot-grid">
          <div>
            <span className="harelink__foot-word">
              HARE<span>LINK</span>
            </span>
            <p className="harelink__foot-tag">
              Payments for the cooperative web, built by Tellus Cooperative on
              the Stellar network.
            </p>
            <Link
              className="harelink__foot-cta"
              href="https://blog.telluscoop.com/subscribe"
              target="_blank"
              rel="noreferrer"
            >
              Subscribe to the newsletter <span aria-hidden>↗</span>
            </Link>
          </div>

          <nav className="harelink__foot-nav" aria-label="Footer">
            {FOOTER_NAV.map((col) => (
              <div key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="harelink__foot-bottom">
          <span>© 2026 Tellus Cooperative</span>
          <div className="harelink__foot-socials">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
              >
                <svg viewBox="0 0 24 24">
                  <path d={social.d} />
                </svg>
              </a>
            ))}
          </div>
          <a
            className="harelink__foot-meta"
            href="https://github.com/Klorenn/"
            target="_blank"
            rel="noreferrer"
          >
            Kl0ren Projects
          </a>
        </div>
      </div>
    </footer>
  );
}
