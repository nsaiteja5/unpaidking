import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const geist = localFont({ src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", variable: "--font-geist" });
const mono = localFont({ src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2", variable: "--font-mono" });
const newsreader = localFont({ src: "../node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2", variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "Unpaid King",
  description: "Every category already has a king. Most of them paid $0. Steal the seat.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable} ${newsreader.variable}`}>
        <div className="gazette">
          <SiteHeader />
          <main className="page-main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

