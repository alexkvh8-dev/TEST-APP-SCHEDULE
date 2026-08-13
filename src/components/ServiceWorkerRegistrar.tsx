"use client";

import { useEffect } from "react";

/** Registers the service worker that backs installability and push. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration fails on http:// origins other than localhost. The app
      // works fine without it — only install and push are unavailable.
    });
  }, []);

  return null;
}
