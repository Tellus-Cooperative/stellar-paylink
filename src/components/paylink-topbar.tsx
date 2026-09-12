import Link from "next/link";
import PaylinkMark from "@/components/paylink-mark";

const GITHUB_URL = "https://github.com/Tellus-Cooperative";

export default function PaylinkTopbar({
  pill = "Testnet",
}: {
  pill?: string;
}) {
  return (
    <header className="harelink__topbar">
      <Link href="/" className="harelink__lockup" aria-label="HareLink home">
        <PaylinkMark />
        <span className="harelink__wordmark" aria-hidden="true">
          HARE<span>LINK</span>
        </span>
      </Link>

      <ul className="harelink__top-nav" aria-label="Primary navigation">
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

      <span className="harelink__pill">{pill}</span>
    </header>
  );
}
