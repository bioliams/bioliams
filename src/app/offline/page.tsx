import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("auth.offlineTitle")} · BioLIMS` };
}

export default async function OfflinePage() {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">{t("auth.offlineTitle")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("auth.offlineBody")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("auth.offlineBack")}
      </p>
    </div>
  );
}
