import type { Metadata } from "next";
import { DemoReader } from "./demo-reader";

export const metadata: Metadata = { title: "Lector de ejemplo · My-Deutsch" };

/** Ruta provisional con 3 páginas sintéticas, hasta que exista la biblioteca (RF-14). */
export default function DemoPage() {
  return <DemoReader />;
}
