import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser, getBaseUrl } from "@/lib/auth";

const geist = localFont({ src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", variable: "--font-geist" });
const mono = localFont({ src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2", variable: "--font-mono" });
const newsreader = localFont({ src: "../node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2", variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "Unpaid King",
  description: "Every category already has a king. Most of them paid $0. Steal the seat.",
  metadataBase: new URL(getBaseUrl()),
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable} ${newsreader.variable}`}>
        <div className="gazette">
          <SiteHeader initialUser={user} />
          <main className="page-main">{children}</main>
          <SiteFooter />
        </div>
        <Analytics />
      </body>
    </html>
  );
}

