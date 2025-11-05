import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppClient from "@/components/AppClient";
import NavDesktop from "@/components/NavDesktop";
import NavMobile from "@/components/NavMobile";
import ClientProviders from "@/components/client-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Xchange",
  description: "Buy and sell locally",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <ClientProviders>
          <AppClient>{children}</AppClient>
        </ClientProviders>
      </body>
    </html>
  );
}
