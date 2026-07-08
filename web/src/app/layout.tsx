import type { Metadata } from "next";
import { Space_Grotesk, Inter, Unbounded } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import ClientProviders from "@/components/providers/ClientProviders";
import CursorFX from "@/components/CursorFX";
import OnboardingGuide from "@/components/OnboardingGuide";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const heroFont = Unbounded({
  subsets: ["latin"],
  variable: "--font-hero",
  weight: ["400", "600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DeFi Mosaic — Predict. Chain. Prosper.",
  description:
    "Cascading prediction markets, social copy trading and AI-powered portfolio strategies on Polygon. Earn Mosaic Points with every move.",
  keywords: ["DeFi", "prediction markets", "copy trading", "Polygon", "Web3"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${heroFont.variable} antialiased`}>
        {/* Ambient animated background */}
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-blob aurora-blob-1" />
          <div className="aurora-blob aurora-blob-2" />
          <div className="aurora-blob aurora-blob-3" />
        </div>
        <div className="grid-overlay" aria-hidden="true" />
        <CursorFX />

        <ClientProviders>
          <Header />
          {children}
          <OnboardingGuide />
        </ClientProviders>
      </body>
    </html>
  );
}
