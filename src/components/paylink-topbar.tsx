import Link from "next/link";
import BrandMark from "@/components/brand-mark";

const GITHUB_URL = "https://github.com/Tellus-Cooperative";

export default function PaylinkTopbar({
  pill = "Testnet",
}: {
  pill?: string;
}) {
  return (
    <header className="paylink__topbar">
      <BrandMark />

      <ul className="paylink__top-nav" aria-label="Primary navigation">
        <li>
          <Link href="/#home">Home</Link>
        </li>
        <li>
          <Link href="/#how-it-works">How it works</Link>
        </li>
        <li>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            Open source
          </a>
        </li>
        <li>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </li>
      </ul>

      <span className="paylink__pill">{pill}</span>
    </header>
  );
}
