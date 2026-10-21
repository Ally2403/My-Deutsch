import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const KEY = "my-deutsch:theme";
const ROUTES = [
  "/",
  "/login",
  "/registro",
  "/recuperar",
  "/privacidad",
  "/lector/demo",
];

test("RF-44 c1: el botón alterna sol/luna entre claro y oscuro y se recuerda al recargar", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", /.*/);
  // Claro: el botón ofrece la luna.
  await page.getByRole("button", { name: "Cambiar a modo oscuro" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(16, 17, 20)");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  // Oscuro: el botón ofrece el sol.
  await page.getByRole("button", { name: "Cambiar a modo claro" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe("light");
});

test("RF-44 c1: sin preferencia guardada el botón parte del tema del sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Cambiar a modo claro" })).toBeVisible();
});

test("RF-44 c2: «Sistema» sigue prefers-color-scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(16, 17, 20)");
  await page.emulateMedia({ colorScheme: "light" });
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(246, 247, 251)");
});

test("RF-44 c2: el tema guardado se aplica antes de hidratar (sin destello)", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript((k) => localStorage.setItem(k, "dark"), KEY);
  await page.route("**/_next/static/**", (r) => r.abort()); // sin JS de React: solo el script inline
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("RF-44 c4: en oscuro la imagen de la página conserva su aspecto (fondo blanco, sin filtros)", async ({
  page,
}) => {
  await page.addInitScript((k) => localStorage.setItem(k, "dark"), KEY);
  await page.goto("/lector/demo");
  const surface = page.getByTestId("page-surface");
  await expect(surface).toBeVisible();
  const style = await surface.evaluate((el) => {
    const cs = getComputedStyle(el);
    const img = el.querySelector("img")!;
    return {
      bg: cs.backgroundColor,
      filter: cs.filter,
      imgFilter: getComputedStyle(img).filter,
    };
  });
  expect(style.bg).toBe("rgb(255, 255, 255)");
  expect(style.filter).toBe("none");
  expect(style.imgFilter).toBe("none");
});

for (const theme of ["light", "dark"] as const) {
  test(`RF-44 c3/c6 (${theme}): sin desbordamiento horizontal y axe sin violaciones serias de contraste`, async ({
    page,
  }) => {
    await page.addInitScript(
      ([k, t]) => localStorage.setItem(k, t),
      [KEY, theme],
    );
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${route} desborda ${overflow}px`).toBeLessThanOrEqual(
        0,
      );
      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious.map((v) => `${route}: ${v.nodes[0]?.html}`)).toEqual([]);
    }
  });
}

test("RF-44 c5: la barra superior cabe a 360 px y sus controles miden ≥ 44 px", async ({
  page,
}) => {
  await page.goto("/login");
  const header = page.getByRole("banner");
  await expect(header).toBeVisible();
  const boxes = await header.locator("a, button").evaluateAll((els) =>
    els
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { w: r.width, h: r.height, right: r.right };
      }),
  );
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  for (const b of boxes) {
    expect(b.h).toBeGreaterThanOrEqual(44 - 0.5);
    expect(b.right).toBeLessThanOrEqual(page.viewportSize()!.width + 0.5);
  }
});

test("RF-36 / RNF-07: ningún control visible de las rutas públicas mide menos de 44 px de alto o ancho", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/login",
    "/registro",
    "/recuperar",
    "/privacidad",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("banner")).toBeVisible();
    const small = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          "a[href], button, input, select, textarea",
        ),
      ]
        .filter((e) => e.offsetParent !== null && !e.closest("nextjs-portal"))
        .filter(
          (e) =>
            !(
              e.tagName === "A" &&
              e.closest("p") &&
              e.classList.contains("tap-link")
            ),
        )
        .map((e) => {
          const r = e.getBoundingClientRect();
          return { t: e.outerHTML.slice(0, 80), w: r.width, h: r.height };
        })
        .filter((b) => b.h < 43.5 || b.w < 43.5),
    );
    expect(small, route).toEqual([]);
  }
});
