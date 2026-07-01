import React from "react";

// Polyfill TextEncoder for server-side face-api/tensorflow evaluation in Next.js SSR
if (typeof global !== 'undefined' && !global.TextEncoder) {
  import(/* webpackIgnore: true */ 'util').then((util) => {
    global.TextEncoder = util.TextEncoder as unknown as typeof global.TextEncoder;
    global.TextDecoder = util.TextDecoder as unknown as typeof global.TextDecoder;
  });
}

import { Inter } from "next/font/google";
import "./globals.css";
import "ckeditor5/ckeditor5.css";
import AppProviders from "./AppProviders";
import type { Metadata, Viewport } from "next";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chấm Công Chấm công",
  description: "Hệ thống quản lý chấm công Chấm công HQ",
  icons: {
    icon: "/images/abc-xanh.png?v=2",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={inter.variable}>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/images/abc-xanh.png?v=2" type="image/png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
