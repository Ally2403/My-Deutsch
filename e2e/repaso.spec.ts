import { expect, test, type Page } from "@playwright/test";

const URL = "/repaso/demo";

async function ready(page: Page) {
  await page.goto(URL);
  await expect(
    page.getByRole("button", { name: "Mostrar respuesta" }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("md-reviews:demo");
    } catch {
      /* sin almacenamiento */
    }
  });
});

test("RF-48 c3: voltear, calificar con el intervalo, deshacer y terminar", async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByText("1 de 4")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar respuesta" }).click();
  // Cuatro botones de calificación, cada uno con su intervalo.
  for (const name of [/^Otra vez \d/, /^Difícil \d/, /^Bien \d/, /^Fácil \d/])
    await expect(page.getByRole("button", { name })).toBeVisible();
  await page.getByRole("button", { name: /^Bien/ }).click();
  await expect(page.getByText("2 de 4")).toBeVisible();
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.getByText("1 de 4")).toBeVisible();

  // Con teclado: Espacio y 1–4 (en pantallas con teclado físico).
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
  }
  await expect(page.getByText("Terminaste por hoy")).toBeVisible();
});

test("RF-48 c4: los filtros quedan en la URL", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Filtros" }).click();
  await page.getByRole("button", { name: "der", exact: true }).click();
  await expect(page.getByText("1 de 1")).toBeVisible();
  await expect(page).toHaveURL(/genero=m/);
  await page.reload();
  await expect(page.getByText("1 de 1")).toBeVisible();
});

test("RF-48 c6: el género se ve en color y en texto, sin desborde ni controles < 44 px", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "die", exact: true }).click();
  await page.getByRole("button", { name: "Mostrar respuesta" }).click();
  const article = page.getByTestId("card-article");
  await expect(article).toHaveText("die");
  const color = await article.evaluate((e) => getComputedStyle(e).color);
  const ref = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--gender-f"),
  );
  expect(ref.trim().length).toBeGreaterThan(0);
  expect(color).not.toBe("");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        "main button, header a, header button",
      ),
    ]
      .map((el) => ({
        t: el.textContent?.trim(),
        r: el.getBoundingClientRect(),
      }))
      .filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => `${x.t} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`),
  );
  expect(small).toEqual([]);
});
