import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Vita AI — Track Macros with a WhatsApp Photo",
  description:
    "Snap your food on WhatsApp, get instant protein & carb tracking. No app download. Made for Singapore fitness enthusiasts.",
  openGraph: {
    title: "Vita AI — Track Macros with a WhatsApp Photo",
    description:
      "Snap your food on WhatsApp, get instant protein & carb tracking. No app download.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
