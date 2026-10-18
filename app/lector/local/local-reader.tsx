"use client";

import { PageReader } from "@/components/reader/page-reader";
import { parsePage } from "@/lib/domain/page";

async function loadPage(n: number) {
  const res = await fetch(`/local-book/pages/${n}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar la página ${n}`);
  return parsePage(await res.json());
}

const imageUrl = (n: number) => `/local-book/pages/${n}.webp`;

export function LocalReader({ total }: { total: number }) {
  return <PageReader total={total} loadPage={loadPage} imageUrl={imageUrl} />;
}
