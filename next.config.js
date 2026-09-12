// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita que Next tracee el home directory (warning "ignored package-lock.json").
  outputFileTracingRoot: path.join(__dirname),
  // Turbopack también necesita root explícito para no escanear /Users/paukoh.
  turbopack: { root: path.join(__dirname) },
  // Evita que pg (nativo) se empaquete y bloquee los workers de recopilación de datos.
  serverExternalPackages: ["pg"],
  experimental: { optimizePackageImports: ["@stellar/stellar-sdk", "react-qr-code"] },
  transpilePackages: ["@stellar/stellar-sdk"],
  // La ruta / lee public/index.html en runtime; en producción ese archivo
  // debe viajar en el bundle de la función (public/ va al CDN, no al FS).
  outputFileTracingIncludes: {
    "/": ["./public/index.html"],
  },
};
module.exports = nextConfig;
