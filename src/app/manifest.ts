import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BioLIMS",
    short_name: "BioLIMS",
    description: "Sample, reagent and freezer tracking for research labs",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0c66e4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Installed apps get a scanner on the home screen's long-press menu, which
    // is how this actually gets used at a freezer.
    shortcuts: [
      { name: "Scan a label", url: "/scan" },
      { name: "Use stock", url: "/inventory/use" },
    ],
  };
}
