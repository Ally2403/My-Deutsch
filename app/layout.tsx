import type { Metadata, Viewport } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/domain/theme";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const heading = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My-Deutsch",
  description:
    "Lee libros de alemán con el significado de cada palabra y los colores de género.",
  // RF-50: PWA instalable (el manifiesto sale de app/manifest.ts).
  appleWebApp: {
    capable: true,
    title: "My-Deutsch",
    statusBarStyle: "default",
  },
  icons: { apple: "/icons/apple-touch-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f1ed" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${body.variable} ${heading.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
