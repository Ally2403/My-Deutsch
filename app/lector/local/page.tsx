import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalReader } from "./local-reader";

export const metadata: Metadata = { title: "Libro local · My-Deutsch" };

/**
 * Solo desarrollo: lee el libro que procesó el worker (`node scripts/link-local-book.mjs`).
 * En producción responde 404, y los libros nunca se versionan (el repositorio es público).
 */
export default function LocalBookPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const manifest = join(process.cwd(), "public", "local-book", "manifest.json");
  if (!existsSync(manifest)) notFound();
  const { pages } = JSON.parse(readFileSync(manifest, "utf-8")) as { pages: unknown[] };
  return <LocalReader total={pages.length} />;
}
