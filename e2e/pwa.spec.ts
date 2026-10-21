import { expect, test, type Page } from "@playwright/test";

// RF-50: requiere una build de producción (`next start`), porque el service worker solo se
// registra en producción. Se activa con E2E_BASE_URL (ver el paso «PWA» del CI).
test.skip(
  !process.env.E2E_BASE_URL,
  "El service worker solo se registra en producción",
);

async function controlled(page: Page) {
  await page.goto("/lector/demo");
  await expect(
    page.getByRole("button", { name: "Tisch", exact: true }),
  ).toBeVisible();
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.ready;
    return !!reg?.active;
  });
}

test("el manifiesto y los íconos responden", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.display).toBe("standalone");
  expect(m.start_url).toBe("/grupos");
  for (const icon of m.icons) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
  }
  expect((await request.get("/icons/apple-touch-180.png")).status()).toBe(200);
});

test("el service worker se registra", async ({ page }) => {
  await controlled(page);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(scope.endsWith("/")).toBe(true);
});

test("sin conexión: lo ya leído se ve y lo demás va a /offline", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Modo sin conexión con SW solo se automatiza en Chromium",
  );
  await controlled(page);
  // Recarga con el SW ya activo para que guarde la navegación, el JSON y la imagen.
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tisch", exact: true }),
  ).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>("img[alt^='Imagen']");
    return !!img && img.complete && img.naturalWidth > 0;
  });

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tisch", exact: true }),
  ).toBeVisible();

  await page.goto("/diccionario");
  await expect(
    page.getByRole("heading", { name: "Sin conexión" }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("al cambiar de usuaria o cerrar sesión se vacían los cachés de datos", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "La purga se automatiza en Chromium");
  await controlled(page);
  const names = (msg: unknown) =>
    page.evaluate(async (m) => {
      const reg = await navigator.serviceWorker.ready;
      reg.active!.postMessage(m);
      await new Promise((r) => setTimeout(r, 400));
      return (await caches.keys()).filter((k) => k.startsWith("md-data-"));
    }, msg);

  await names({ type: "user", id: "user-a" });
  await page.evaluate(async () => {
    const c = await caches.open("md-data-1-user-a");
    await c.put("/x", new Response("pagina de A"));
  });
  // Entra otra usuaria en el mismo dispositivo: nada de A se conserva.
  expect(await names({ type: "user", id: "user-b" })).toEqual([]);

  await page.evaluate(async () => {
    const c = await caches.open("md-data-1-user-b");
    await c.put("/y", new Response("pagina de B"));
  });
  // Cerrar sesión: purga.
  expect(await names({ type: "purge" })).toEqual([]);
});
