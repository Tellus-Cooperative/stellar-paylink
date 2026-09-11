import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Evita que Next intente prerenderizar esta ruta durante "Collecting page data".
// La lectura de index.html (1.5 MB) en workers de compilación bloquea el build con Turbopack.
export const dynamic = "force-dynamic";

export async function GET() {
  const html = await readFile(join(process.cwd(), "index.html"), "utf-8");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}