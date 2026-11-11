import { Scanner } from "./scanner";
import { PageHeader } from "@/components/page-header";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("nav.scan")} · BioLIMS` };
}

export default async function ScanPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader
        title={t("misc.scan.title")}
        description={t("misc.scan.description")}
      />
      <Scanner />
    </div>
  );
}
