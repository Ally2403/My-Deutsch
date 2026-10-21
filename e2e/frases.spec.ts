import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL = "/lector/demo";

async function ready(page: Page) {
  await page.goto(URL);
  await expect(
    page.getByRole("button", { name: "Tisch", exact: true }),
  ).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>("img[alt^='Imagen']");
    return !!img && img.complete && img.naturalWidth > 0;
  });
}

const word = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test("RF-47 c2: arrastrar con el mouse sobre dos líneas abre el panel con la traducción, sin red", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "pc-1280", "el arrastre es del mouse");
  await ready(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const from = await word(page, "Der").boundingBox();
  const to = await word(page, "neu.").boundingBox();
  expect(from && to).toBeTruthy();
  await page.mouse.move(from!.x + 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width - 2, to!.y + to!.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  const dialog = page.getByRole("dialog", { name: /traducción de la frase/i });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("La mesa está en la casa.");
  await expect(dialog).toContainText("La lámpara y las casas son nuevas.");
  expect(requests).toEqual([]);
  // La selección nativa no queda atrapada tras abrir el panel.
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("RF-47 c2: el modo «Frase» abre el panel con dos toques; un solo toque no", async ({
  page,
}) => {
  await ready(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  // El trozo se traduce al momento con un servicio externo; en la prueba se simula (RF-47).
  const sent: string[] = [];
  await page.route("**/api.mymemory.translated.net/**", (route) => {
    sent.push(
      decodeURIComponent(
        new globalThis.URL(route.request().url()).searchParams.get("q") ?? "",
      ),
    );
    return route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        responseStatus: 200,
        responseData: { translatedText: "mesa en casa" },
      }),
    });
  });
  await page.getByRole("button", { name: "Frase", exact: true }).click();
  await word(page, "Tisch").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await word(page, "Haus.").click();
  const dialog = page.getByRole("dialog", { name: /traducción de la frase/i });
  await expect(dialog).toBeVisible();
  // Sale la traducción de lo elegido, sin pasar por «Ver la oración completa».
  await expect(dialog).toContainText("mesa en casa");
  await expect(dialog).toContainText("Traducción automática");
  await expect(
    dialog.getByRole("button", { name: "Ver la oración completa" }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Copiar" })).toBeVisible();
  expect(sent.length).toBe(1);
  expect(sent[0]).toMatch(/^Tisch .*Haus\.$/);
  // Solo salió la consulta del trozo, nada más.
  expect(requests.filter((u) => !u.includes("mymemory"))).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("RF-47 c2: «Traducir la oración» desde el panel de palabra y la tecla T", async ({
  page,
}) => {
  await ready(page);
  await word(page, "Lampe").click();
  await page.getByRole("button", { name: "Traducir la oración" }).click();
  const dialog = page.getByRole("dialog", { name: /traducción de la frase/i });
  await expect(dialog).toContainText("La lámpara y las casas son nuevas.");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await word(page, "Berlin.").focus();
  await page.keyboard.press("t");
  await expect(
    page.getByRole("dialog", { name: /traducción de la frase/i }),
  ).toContainText("Anna viaja a Berlín.");
});

test("RF-47 c3 / RNF-09: glosas con artículo en color y escrito; axe sin violaciones", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Frase", exact: true }).click();
  await word(page, "Der").click();
  await word(page, "Berlin.").click();
  const dialog = page.getByRole("dialog", { name: /traducción de la frase/i });
  await expect(dialog.locator(".gender-m", { hasText: "der" })).toBeVisible();
  await expect(dialog.locator(".gender-f", { hasText: "die" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
});
