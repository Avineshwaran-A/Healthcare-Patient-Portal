import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

import { Toaster } from "@/components/toaster";

import "./globals.css";

// Three voices, self-hosted at build time by next/font (no runtime request to Google).
// Display: Fraunces (variable serif, optical size + softness axes) for headlines.
// Sans: Instrument Sans for interface and body. Mono: JetBrains Mono for data and labels.
const display = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const sans = Instrument_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });

export const metadata: Metadata = {
  title: { default: "CarePortal – Healthcare Patient Portal", template: "%s · CarePortal" },
  description: "Book appointments, view prescriptions and lab reports, and manage hospital operations.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f6f2e9", width: "device-width", initialScale: 1 };

// Runs before paint: a visitor who already saw the loader this session never sees it again.
const LOADER_GATE = `document.documentElement.dataset.js="1";try{if(sessionStorage.getItem("cp-loaded"))document.documentElement.dataset.loaded="1"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOADER_GATE }} />
        <noscript>
          <style>{`[data-loader],[data-curtain]{display:none!important}[data-mask] .mask-line>span{transform:none!important}[data-clip]{clip-path:none!important}[data-hero-fade]{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
