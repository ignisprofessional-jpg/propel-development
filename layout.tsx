import type { Metadata, Viewport } from "next";
import { Amiri, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getTheme } from "@/lib/i18n/server";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic"], weight: ["400", "700"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Propel Development", template: "%s · Propel" },
  description: "Islam, agence Propel et développement personnel, au même endroit.",
  robots: { index: false, follow: false },
  applicationName: "Propel Development",
  appleWebApp: { capable: true, title: "Propel", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

/** La barre d'état du téléphone prend la couleur du thème choisi (sombre ou clair). */
export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "resizes-content",
    colorScheme: theme === "light" ? "light" : "dark",
    themeColor: theme === "light" ? "#f2f2f2" : "#080808",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  return (
    <html lang={locale} data-theme={theme} className={`${geist.variable} ${geistMono.variable} ${amiri.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <Toaster
            theme={theme}
            position="bottom-right"
            toastOptions={{ style: { borderRadius: 16, background: "var(--surface)", border: "1px solid var(--line-strong)", color: "var(--fg)" } }}
          />
        </I18nProvider>
      </body>
    </html>
  );
}
