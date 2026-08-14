import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaProvider } from "@/components/pwa";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <PwaProvider />
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
