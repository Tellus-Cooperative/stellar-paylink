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
  title: "Paylink | Tellus Cooperative",
  description:
    "Create a payment link and receive XLM or USDC on Stellar without giving up custody.",
};

export const viewport: Viewport = {
  themeColor: "#161616",
  viewportFit: "cover",
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
