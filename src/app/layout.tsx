import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const orbitSans = localFont({
  src: "../fonts/orbit-sans.ttf",
  variable: "--font-orbit-sans",
  display: "block",
  weight: "400",
});
const orbitDisplay = localFont({
  src: "../fonts/orbit-display.ttf",
  variable: "--font-orbit-display",
  display: "block",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "HareLink — Open-source Stellar Payment Links",
    template: "%s | HareLink",
  },
  description:
    "Create and share non-custodial payment links on Stellar. HareLink is open source, wallet-signed, and built by Tellus Cooperative.",
  applicationName: "HareLink",
  authors: [{ name: "Tellus Cooperative", url: "https://telluscoop.org" }],
  creator: "Tellus Cooperative",
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim().length > 0
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://stellar-paylink-lac.vercel.app")
  ),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "HareLink",
    title: "HareLink — Open-source Stellar Payment Links",
    description:
      "Create and share non-custodial payment links on Stellar. HareLink is open source, wallet-signed, and built by Tellus Cooperative.",
    images: [{ url: "/harelink-og.png", width: 1200, height: 630, alt: "HareLink — Open-source Stellar Payment Links" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HareLink — Open-source Stellar Payment Links",
    description:
      "Create and share non-custodial payment links on Stellar. HareLink is open source, wallet-signed, and built by Tellus Cooperative.",
    images: [{ url: "/harelink-og.png", alt: "HareLink — Open-source Stellar Payment Links" }],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  appleWebApp: {
    capable: true,
    title: "HareLink",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#161616",
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${orbitSans.variable} ${orbitDisplay.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
