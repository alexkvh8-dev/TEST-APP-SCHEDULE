import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinX — every rupee, tracked",
  description:
    "Log every purchase in two taps, see where your money went in graphs, and get an honest daily, weekly and monthly read on it.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FinX" },
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
    { media: "(prefers-color-scheme: light)", color: "#efece6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0d" },
  ],
};

/*
 * Runs before first paint so a saved theme choice never flashes the wrong
 * ground colour. Nothing is stamped when the choice is "system" — the CSS
 * media query handles that case on its own.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("paisa-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
