import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { configureCache } from "../core/cache.ts";
import { setUsdaKey } from "../core/usda.ts";

// Optional free USDA key (https://fdc.nal.usda.gov/api-key-signup) for higher
// rate limits; falls back to the shared DEMO_KEY when unset.
setUsdaKey(import.meta.env.VITE_USDA_API_KEY);

// Back the core lookup cache with localStorage so scanned products persist
// across reloads and remain available offline.
configureCache({
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage full — ignore */
    }
  },
});

// Register the service worker for offline support / installability — but only
// in production. In dev it would cache Vite's module URLs and fight HMR, so we
// proactively unregister any leftover SW and clear its caches there.
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW registration is best-effort */
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    if ("caches" in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
