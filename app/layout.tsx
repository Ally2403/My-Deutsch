import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My-Deutsch",
  description:
    "Lee libros de alemán con el significado de cada palabra y los colores de género.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5b2a86",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
