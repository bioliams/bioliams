import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaProvider } from "@/components/pwa";
import { ThemeProvider } from "next-themes";
import { getLocale } from "@/i18n/server";
import { dirOf } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Persian script; Latin text inside Persian pages (IDs, units) still falls
// back to Geist through the font stack.
const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "BioLIMS",
  description: "Open-source lab information management",
  appleWebApp: { capable: true, title: "BioLIMS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0c66e4",
  // The scanner and the freezer grid both suffer if a stray double-tap zooms
  // the page, but pinch-zoom stays available for anyone who needs it.
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider locale={locale}>
            <PwaProvider />
            {children}
            <Toaster richColors position={dirOf(locale) === "rtl" ? "bottom-left" : "bottom-right"} />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
