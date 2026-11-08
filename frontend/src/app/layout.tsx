import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/toaster";

import "./globals.css";

// Self-hosted at build time by next/font (no runtime request to Google),
// latin subset only, swap to avoid blocking text.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "CarePortal – Healthcare Patient Portal", template: "%s · CarePortal" },
  description: "Book appointments, view prescriptions and lab reports, and manage hospital operations.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#10222f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
