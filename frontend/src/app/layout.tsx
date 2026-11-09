import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/toaster";

import "./globals.css";

// One typeface for the whole portal: Inter (variable, 400–600 used), self-hosted at build
// time by next/font, so there is no runtime request to Google. Fallbacks live in tailwind.config.ts.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Healthcareportal – Healthcare Patient Portal", template: "%s · Healthcareportal" },
  description: "Book appointments, view prescriptions and lab reports, and manage hospital operations.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f6f2e9", width: "device-width", initialScale: 1 };

// Runs before paint: a visitor who already saw the loader this session never sees it again.
const LOADER_GATE = `document.documentElement.dataset.js="1";try{if(sessionStorage.getItem("cp-loaded"))document.documentElement.dataset.loaded="1"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
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
