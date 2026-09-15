import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EthinX Short-Form — Controlled Production Line",
  description: "Business URL → 4×15s video package. Fail-closed QA, bounded repair, human approval.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-zinc-50 text-zinc-900"}>{children}</body>
    </html>
  );
}