import "server-only";
import QRCode from "qrcode";
import { baseUrl } from "@/lib/auth";

/**
 * What a label's QR code points at.
 *
 * The code carries a URL rather than a bare ID so a phone's built-in camera is
 * a working scanner — no app to install, which is the difference between a lab
 * using barcodes and a lab meaning to. `/s/<display id>` resolves to whichever
 * record that ID belongs to in the scanning user's lab.
 */
export function scanUrl(displayId: string) {
  return `${baseUrl()}/s/${encodeURIComponent(displayId)}`;
}

/** Inline SVG for a record's label, sized for printing at ~20mm. */
export async function qrSvg(displayId: string, sizePx = 128) {
  return QRCode.toString(scanUrl(displayId), {
    type: "svg",
    margin: 0,
    width: sizePx,
    errorCorrectionLevel: "M",
  });
}
