"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Pull the record ID out of whatever the camera read. */
export function codeFromScan(raw: string): string {
  const value = raw.trim();
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/s\/([^/]+)$/);
    if (match) return decodeURIComponent(match[1]).toUpperCase();
  } catch {
    // Not a URL — a plain display ID, e.g. from a 1D barcode.
  }
  return value.toUpperCase();
}

type Detector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"idle" | "running" | "unsupported" | "denied">("idle");
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  async function start() {
    const Ctor = (window as unknown as { BarcodeDetector?: new (o: object) => Detector })
      .BarcodeDetector;
    if (!Ctor) {
      setState("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("running");

      const detector = new Ctor({ formats: ["qr_code", "code_128"] });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          if (found.length > 0) {
            stop();
            router.push(`/s/${encodeURIComponent(codeFromScan(found[0].rawValue))}`);
            return;
          }
        } catch {
          // A frame that can't be decoded is normal; keep looking.
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setState("denied");
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          className={state === "running" ? "aspect-square w-full object-cover" : "hidden"}
        />
        {state !== "running" && (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {state === "unsupported"
                ? "This browser can't use the camera scanner. Your phone's own camera app will still open a label — or type the ID below."
                : state === "denied"
                  ? "Camera permission was refused, so use the ID below instead."
                  : "Point the camera at a label to open that record."}
            </p>
            {state !== "unsupported" && <Button onClick={start}>Start camera</Button>}
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) router.push(`/s/${encodeURIComponent(codeFromScan(manual))}`);
        }}
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="or type an ID, e.g. RGT-000006"
          className="font-mono"
        />
        <Button type="submit" variant="outline">
          Open
        </Button>
      </form>
    </div>
  );
}
