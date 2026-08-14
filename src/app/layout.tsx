import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paisa — every rupee, tracked",
  description:
    "Log every purchase in two taps, see where your money went in graphs, and get an honest daily, weekly and monthly read on it.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Paisa" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/*
          Registered at the root, not inside the signed-in layout: the sign-in
          screen is where every new visitor lands, and the browser will not
          offer "Install" until a service worker is registered on the page
          being viewed.
        */}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
