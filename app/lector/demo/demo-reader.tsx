"use client";

import { parsePage } from "@/lib/domain/page";
import { PageReader } from "@/components/reader/page-reader";

const TOTAL = 3;

async function loadPage(n: number) {
  const res = await fetch(`/demo/page-${n}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar la página ${n}`);
  return parsePage(await res.json());
}

const imageUrl = (n: number) => `/demo/page-${n}.webp`;

export function DemoReader() {
  return <PageReader total={TOTAL} loadPage={loadPage} imageUrl={imageUrl} />;
}
