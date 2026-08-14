import { Scanner } from "./scanner";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Scan · BioLIMS" };

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader
        title="Scan a label"
        description="Opens the record the label belongs to. Works with a phone camera, a USB scanner, or the ID typed by hand."
      />
      <Scanner />
    </div>
  );
}
