import { Scanner } from "./scanner";

export const metadata = { title: "Scan · BioLIMS" };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Scan a label</h1>
        <p className="text-sm text-muted-foreground">
          Opens the record the label belongs to. Works with a phone camera, a USB scanner, or
          the ID typed by hand.
        </p>
      </div>
      <Scanner />
    </div>
  );
}
