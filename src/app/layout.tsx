import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ethian",
    template: "%s | Ethian",
  },
  description:
    "Ethian — a calm, intentional email client inspired by Hey.com. " +
    "Take back control of your inbox with Screener, Imbox, Feed, and Paper Trail.",
  keywords: ["email", "inbox", "hey", "imbox", "screener"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
