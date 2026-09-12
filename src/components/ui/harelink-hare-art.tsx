import { HARE_PATH } from "@/components/ui/hare-path";

// Estela de píxeles: cuadrados sueltos que salen desde el cuarto trasero de la
// liebre hacia abajo-izquierda. Deliberadamente irregular para que lea como
// movimiento y no como una flecha. Coordenadas en el espacio del viewBox.
const TRAIL: { x: number; y: number; s: number; o: number; teal?: boolean }[] = [
  { x: 250, y: 372, s: 16, o: 0.55 },
  { x: 224, y: 396, s: 13, o: 0.5, teal: true },
  { x: 268, y: 344, s: 11, o: 0.4 },
  { x: 196, y: 380, s: 14, o: 0.4 },
  { x: 172, y: 404, s: 10, o: 0.34, teal: true },
  { x: 206, y: 414, s: 9, o: 0.3 },
  { x: 146, y: 388, s: 12, o: 0.28 },
  { x: 122, y: 410, s: 8, o: 0.26, teal: true },
  { x: 156, y: 424, s: 7, o: 0.22 },
  { x: 96, y: 398, s: 10, o: 0.2 },
  { x: 72, y: 416, s: 7, o: 0.17, teal: true },
  { x: 104, y: 428, s: 6, o: 0.15 },
  { x: 48, y: 406, s: 8, o: 0.13 },
  { x: 60, y: 432, s: 5, o: 0.11, teal: true },
  { x: 24, y: 420, s: 6, o: 0.1 },
  { x: 8, y: 412, s: 5, o: 0.08 },
];

/**
 * Arte del panel de recibo: la marca oficial en blanco sobre fondo oscuro, con
 * una estela mínima de píxeles detrás. La liebre conserva su path y su relación
 * de aspecto original: solo se la desplaza dentro de un lienzo más ancho.
 */
export default function HareArt() {
  return (
    <span className="harelink__hare-art" aria-hidden="true">
      <svg viewBox="0 0 1000 532" fill="none" aria-hidden focusable="false">
        {TRAIL.map((pixel) => (
          <rect
            key={`${pixel.x}-${pixel.y}`}
            x={pixel.x}
            y={pixel.y}
            width={pixel.s}
            height={pixel.s}
            rx={1}
            fill={pixel.teal ? "#3F8487" : "currentColor"}
            opacity={pixel.o}
          />
        ))}
        <g transform="translate(314 0)">
          <path d={HARE_PATH} fill="currentColor" />
        </g>
      </svg>
    </span>
  );
}
