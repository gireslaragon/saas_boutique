import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default:  "Boutique SaaS",
    template: "%s — Boutique SaaS",
  },
  description: "Gestion de boutique, stock et caisse pour les commerces africains",
  manifest:    "/manifest.json",
  icons: {
    icon:  "/icons/icon.png",
    apple: "/icons/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor:     "#1e3a5f",
  width:          "device-width",
  initialScale:   1,
  maximumScale:   1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              border:     "1px solid #334155",
              color:      "#f1f5f9",
            },
          }}
        />
      </body>
    </html>
  );
}
