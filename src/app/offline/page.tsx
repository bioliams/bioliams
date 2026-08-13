export const metadata = { title: "Offline · BioLIMS" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold">You&rsquo;re offline</h1>
      <p className="text-sm text-muted-foreground">
        BioLIMS needs a connection to show lab records. Nothing you did is lost — anything you
        recorded while connected is saved on the server.
      </p>
      <p className="text-sm text-muted-foreground">
        This page will work again as soon as you&rsquo;re back on Wi-Fi.
      </p>
    </div>
  );
}
