"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and warns when the connection drops.
 *
 * The warning matters more than the caching: someone recording usage at a
 * -80 freezer, out of Wi-Fi range, needs to know their next tap won't save
 * rather than discover it later from a missing audit entry.
 */
export function PwaProvider() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    }

    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-destructive px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      Offline — you can read what&rsquo;s already loaded, but changes won&rsquo;t save until
      you&rsquo;re back.
    </div>
  );
}
