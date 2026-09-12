import { HARE_PATH, HARE_VIEWBOX } from "@/components/ui/hare-path";

// Product mark (liebre saltando). Solo el rabbit, sin círculo ni contenedor.
export default function PaylinkMark() {
  return (
    <span className="harelink__mark" aria-hidden="true">
      <svg viewBox={HARE_VIEWBOX} fill="none" aria-hidden>
        <path d={HARE_PATH} fill="currentColor" />
      </svg>
    </span>
  );
}
