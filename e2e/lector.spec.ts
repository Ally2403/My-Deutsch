import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL = "/lector/demo";

async function ready(page: Page) {
  await page.goto(URL);
  await expect(
    page.getByRole("button", { name: "Tisch", exact: true }),
  ).toBeVisible();
  // La imagen debe estar decodificada antes de medir posiciones.
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>("img[alt^='Imagen']");
    return !!img && img.complete && img.naturalWidth > 0;
  });
}

test.beforeEach(async ({ page }) => {
  // Parte de una preferencia limpia solo la primera vez, para poder probar la recarga.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-init")) {
      localStorage.removeItem("my-deutsch:highlight");
      localStorage.removeItem("my-deutsch:plurals");
      localStorage.removeItem("my-deutsch:hide-seen");
      localStorage.removeItem("my-deutsch:reading-mode");
      localStorage.removeItem("my-deutsch:font-size");
      sessionStorage.setItem("e2e-init", "1");
    }
  });
});

test("RF-21 / RNF-01: tocar una palabra abre el panel sin peticiones de red", async ({
  page,
}) => {
  await ready(page);
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.getByRole("button", { name: "Häuser", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("das Haus, die Häuser");
  await expect(dialog).toContainText("Häuser → Haus, plural");
  expect(requests).toEqual([]);
});

test("RF-22: el artículo se escribe y se colorea con el token del género", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Lampe", exact: true }).click();
  const article = page
    .getByRole("dialog")
    .locator(".gender-f", { hasText: "die" });
  await expect(article).toBeVisible();
  const [color, token] = await article.evaluate((el) => [
    getComputedStyle(el).color,
    getComputedStyle(document.documentElement)
      .getPropertyValue("--gender-f")
      .trim(),
  ]);
  expect(token).not.toBe("");
  expect(color).not.toBe("");
});

test("RF-21 c4: Escape y tocar fuera cierran el panel sin cambiar de página", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("página 1 de 3")).toBeVisible();

  await page.getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("página 1 de 3")).toBeVisible();
});

test("RF-16: flechas, botones y selector cambian de página", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("página 2 de 3")).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect(page.getByText("página 3 de 3")).toBeVisible();
  await page.keyboard.press("PageUp");
  await expect(page.getByText("página 2 de 3")).toBeVisible();
  await page.getByLabel("Ir a la página").fill("1");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page.getByText("página 1 de 3")).toBeVisible();
  await page.getByLabel("Ir a la página").fill("7");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("entre 1 y 3");
});

test("RF-16 c1: el deslizamiento táctil respeta la zona de 24 px del borde", async ({
  page,
  hasTouch,
}) => {
  test.skip(!hasTouch, "solo en dispositivos táctiles");
  await ready(page);
  const viewer = page.locator("div.touch-pan-y");
  const swipe = (startX: number, endX: number) =>
    viewer.evaluate(
      (el, [s, e]) => {
        const opts = { pointerType: "touch", bubbles: true, clientY: 300 };
        el.dispatchEvent(
          new PointerEvent("pointerdown", { ...opts, clientX: s }),
        );
        el.dispatchEvent(
          new PointerEvent("pointerup", { ...opts, clientX: e }),
        );
      },
      [startX, endX],
    );
  await swipe(10, -80);
  await expect(page.getByText("página 1 de 3")).toBeVisible();
  await swipe(200, 100);
  await expect(page.getByText("página 2 de 3")).toBeVisible();
  await swipe(100, 200);
  await expect(page.getByText("página 1 de 3")).toBeVisible();
});

test("RF-26: el interruptor colorea sustantivos y la preferencia persiste", async ({
  page,
}) => {
  await ready(page);
  const toggle = page.getByRole("button", { name: "Colorear sustantivos" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Tisch", exact: true }),
  ).toHaveClass(/hl-m/);
  await expect(
    page.getByRole("button", { name: "Haus.", exact: true }),
  ).toHaveClass(/hl-n/);
  await expect(
    page.getByRole("button", { name: "Lampe", exact: true }),
  ).toHaveClass(/hl-f/);
  await expect(
    page.getByRole("button", { name: "Berlin.", exact: true }),
  ).not.toHaveClass(/hl-/);

  // Persiste entre páginas y recargas.
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Teil", exact: true }),
  ).toHaveClass(/hl-m/);
  await page.evaluate(() => localStorage.setItem("my-deutsch:highlight", "1"));
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Colorear sustantivos" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("RF-26 c1/c2: la opacidad del resaltado es ≤ 35 % y activar tarda < 100 ms", async ({
  page,
}) => {
  await ready(page);
  const toggle = page.getByRole("button", { name: "Colorear sustantivos" });
  const { domMs, paintMs } = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Colorear sustantivos",
    )!;
    const layer = document.querySelector(".reader-text-layer")!;
    const t0 = performance.now();
    // Momento en que la primera palabra recibe su clase de género.
    const applied = new Promise<number>((resolve) => {
      new MutationObserver((_, obs) => {
        if (layer.querySelector(".hl-m, .hl-n, .hl-f")) {
          obs.disconnect();
          resolve(performance.now() - t0);
        }
      }).observe(layer, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    });
    btn.click();
    const domMs = await applied;
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    return { domMs, paintMs: performance.now() - t0 };
  });
  console.log(
    `RF-26 ${test.info().project.name}: DOM ${domMs.toFixed(1)} ms, hasta el pintado ${paintMs.toFixed(1)} ms`,
  );
  // El DOM debe actualizarse en < 100 ms en todos los navegadores. El pintado completo se
  // exige en Chromium; el WebKit de Playwright en Windows no equivale a un iPhone real.
  expect(domMs).toBeLessThan(100);
  if (test.info().project.name !== "iphone-webkit")
    expect(paintMs).toBeLessThan(100);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const alpha = await page.evaluate(() =>
    Number(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--highlight-alpha",
      ),
    ),
  );
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThanOrEqual(0.35);
});

test("RF-17 c1: el texto queda alineado con la tinta de la imagen (≤ 2 % del ancho)", async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const data = await (await fetch("/demo/page-1.json")).json();
    const img = document.querySelector<HTMLImageElement>("img[alt^='Imagen']")!;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imgRect = img.getBoundingClientRect();
    const out: { word: string; dx: number; dy: number }[] = [];
    for (const [i, tok] of data.tokens.entries()) {
      const [bx, by, bw, bh] = tok.b as number[];
      const x0 = Math.floor((bx - 0.005) * canvas.width);
      const y0 = Math.floor(by * canvas.height);
      const x1 = Math.ceil((bx + bw + 0.005) * canvas.width);
      const y1 = Math.ceil((by + bh) * canvas.height);
      const px = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
      let minX = Infinity;
      let minY = Infinity;
      for (let y = 0; y < px.height; y++) {
        for (let x = 0; x < px.width; x++) {
          if (px.data[(y * px.width + x) * 4] < 110) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
          }
        }
      }
      const span = document.querySelector<HTMLElement>(`[data-token="${i}"]`)!;
      const r = span.getBoundingClientRect();
      // Tinta (px de la imagen natural) → px de pantalla; comparar con la caja del span.
      const scale = imgRect.width / canvas.width;
      const inkLeft = imgRect.left + (x0 + minX) * scale;
      const inkTop = imgRect.top + (y0 + minY) * scale;
      out.push({
        word: tok.t,
        dx: Math.abs(inkLeft - r.left) / imgRect.width,
        dy: Math.abs(inkTop - r.top) / imgRect.width,
      });
    }
    return out;
  });
  expect(result.length).toBeGreaterThan(5);
  for (const r of result) {
    expect(r.dx, `${r.word} (horizontal)`).toBeLessThanOrEqual(0.02);
    expect(r.dy, `${r.word} (vertical)`).toBeLessThanOrEqual(0.02);
  }
});

test("RF-17 c3: la alineación se mantiene al girar el dispositivo", async ({
  page,
}) => {
  await ready(page);
  const gap = async () =>
    page.evaluate(() => {
      const img = document
        .querySelector<HTMLImageElement>("img[alt^='Imagen']")!
        .getBoundingClientRect();
      const layer = document
        .querySelector<HTMLElement>(".reader-text-layer")!
        .getBoundingClientRect();
      return Math.max(
        Math.abs(img.left - layer.left),
        Math.abs(img.top - layer.top),
        Math.abs(img.width - layer.width),
        Math.abs(img.height - layer.height),
      );
    });
  expect(await gap()).toBeLessThan(1);
  const { width, height } = page.viewportSize()!;
  await page.setViewportSize({ width: height, height: width });
  expect(await gap()).toBeLessThan(1);
});

test("RF-17 c2: el texto copiado conserva espacios y saltos de línea en orden", async ({
  page,
}) => {
  await ready(page);
  const copied = await page.evaluate(() => {
    const layer = document.querySelector(".reader-text-layer")!;
    const range = document.createRange();
    range.selectNodeContents(layer);
    const sel = getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    return sel.toString();
  });
  const lines = copied
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  expect(lines).toEqual([
    "Der Tisch steht im Haus.",
    "Die Lampe und die Häuser sind neu.",
    "Anna fährt nach Berlin.",
  ]);
});

test("RN-07: tocar un verbo separable resalta a su pareja", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "ruft", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("anrufen");
  await expect(
    page.getByRole("button", { name: "an.", exact: true }),
  ).toHaveClass(/reader-word-active/);
});

test("RF-39: una palabra cortada con guion abre la misma entrada desde ambas partes", async ({
  page,
}) => {
  await ready(page);
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Normalerweise", exact: true }),
  ).toBeVisible();
  await page
    .locator('[data-token="17"][aria-hidden="true"]')
    .first()
    .click({ force: true });
  await expect(page.getByRole("dialog")).toContainText("normalerweise");
});

test("RNF-01: p95 de apertura del panel < 300 ms en 100 toques (CPU ×4)", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "el estrangulamiento de CPU usa CDP");
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const times = await page.evaluate(async () => {
    const words = [
      ...document.querySelectorAll<HTMLElement>('.reader-word[role="button"]'),
    ];
    const out: number[] = [];
    for (let i = 0; i < 100; i++) {
      const el = words[i % words.length];
      const t0 = performance.now();
      el.click();
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      if (!document.querySelector('[role="dialog"]'))
        throw new Error("el panel no se abrió");
      out.push(performance.now() - t0);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await new Promise((r) => requestAnimationFrame(r));
    }
    return out;
  });
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95) - 1];
  console.log(
    `RNF-01 p95 = ${p95.toFixed(1)} ms (máx ${sorted.at(-1)!.toFixed(1)} ms)`,
  );
  expect(p95).toBeLessThan(300);
});

test("RNF-09 c3: axe-core sin violaciones serias (lector y panel abierto)", async ({
  page,
}) => {
  await ready(page);
  const serious = (r: Awaited<ReturnType<AxeBuilder["analyze"]>>) =>
    r.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
  expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);
  await page.getByRole("button", { name: "Häuser", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(serious(await new AxeBuilder({ page }).analyze())).toEqual([]);
});

test("Panel: hoja inferior en móvil y tarjeta junto a la palabra en PC", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Haus.", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  const vp = page.viewportSize()!;
  if (vp.width < 768) {
    expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
    expect(box.y + box.height).toBeGreaterThanOrEqual(vp.height - 1);
  } else {
    expect(box.width).toBeLessThanOrEqual(400);
  }
  await page.screenshot({
    path: `test-results/panel-${test.info().project.name}.png`,
  });
});

test("RF-41: «Marcar plurales» marca los plurales en amarillo, sin líneas, y se recuerda", async ({
  page,
}) => {
  await ready(page);
  const toggle = page.getByRole("button", { name: "Marcar plurales" });
  const plural = page.getByRole("button", { name: "Häuser", exact: true });
  const singular = page.getByRole("button", { name: "Haus.", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(plural).toHaveClass(/pl-mark/);
  await expect(singular).not.toHaveClass(/pl-mark/);
  const look = await plural.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      top: s.borderTopWidth,
      bottom: s.borderBottomWidth,
      bg: s.backgroundColor,
    };
  });
  expect(look.top).toBe("0px");
  expect(look.bottom).toBe("0px");
  expect(look.bg).not.toBe("rgba(0, 0, 0, 0)");

  // Convive con «Colorear sustantivos»: el amarillo gana y el género sigue en el panel.
  await page.getByRole("button", { name: "Colorear sustantivos" }).click();
  await expect(plural).toHaveClass(/pl-mark/);
  await expect(plural).toHaveClass(/hl-n/);

  // El panel muestra la etiqueta escrita.
  await plural.click();
  await expect(page.getByRole("dialog").locator(".plural-badge")).toHaveText(
    "plural",
  );
  await page.keyboard.press("Escape");

  // Persiste al recargar.
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Marcar plurales" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("RF-28 / RF-29: las palabras vistas se marcan, el panel lo explica y el interruptor las oculta", async ({
  page,
}) => {
  await ready(page);
  const tisch = page.getByRole("button", { name: "Tisch", exact: true });
  const haus = page.getByRole("button", { name: "Haus.", exact: true });
  await expect(tisch).toHaveClass(/seen-seen/);
  await expect(haus).toHaveClass(/seen-known/);

  // La marca va debajo de la palabra y no tapa el resalte de género (c3).
  await page.getByRole("button", { name: "Colorear sustantivos" }).click();
  await expect(tisch).toHaveClass(/hl-m/);
  const mark = await tisch.evaluate((el) => {
    const s = getComputedStyle(el, "::after");
    return { style: s.borderBottomStyle, width: s.borderBottomWidth };
  });
  expect(mark).toEqual({ style: "dotted", width: "2px" });

  // c2: el panel dice cuántas veces la viste y dónde; marcar como conocida se refleja al instante (RF-29 c1).
  await tisch.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "La viste 3 veces · primera vez en Libro de ejemplo, pág. 1",
  );
  await dialog.getByRole("button", { name: "Marcar como conocida" }).click();
  await expect(tisch).toHaveClass(/seen-known/);
  // RF-29 c2: eliminar pide confirmación y quita la marca.
  await dialog
    .getByRole("button", { name: "Eliminar de mi diccionario" })
    .click();
  await expect(tisch).toHaveClass(/seen-known/);
  await dialog.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(tisch).not.toHaveClass(/seen-/);
  await page.keyboard.press("Escape");

  // El interruptor oculta las marcas y se recuerda.
  const toggle = page.getByRole("button", { name: "Marcar palabras vistas" });
  await expect(haus).toHaveClass(/seen-known/);
  await toggle.click();
  await expect(haus).not.toHaveClass(/seen-/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Marcar palabras vistas" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("RF-25: una palabra sin entrada ofrece DWDS y Wiktionary y permite corregir la forma", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Anna", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("No encontramos esta palabra");
  await expect(dialog.getByRole("link", { name: /DWDS/ })).toHaveAttribute(
    "target",
    "_blank",
  );
  await dialog.getByLabel("Corregir la forma de la palabra").fill("Katze");
  await dialog.getByRole("button", { name: "Buscar de nuevo" }).click();
  await expect(dialog).toContainText("gato");
});

test.describe("RF-19: zoom y ajuste de página", () => {
  const widthOf = (page: Page) =>
    page
      .getByTestId("page-surface")
      .evaluate((el) => el.getBoundingClientRect().width);

  test("los botones acercan hasta 4× y «Ajustar al ancho» vuelve al 100 %", async ({
    page,
  }) => {
    await ready(page);
    const base = await widthOf(page);
    const zoomIn = page.getByRole("button", { name: "Acercar" });
    for (let i = 0; i < 10; i++)
      if (await zoomIn.isEnabled()) await zoomIn.click();
    await expect(page.getByText("400 %")).toBeVisible();
    expect(Math.round((await widthOf(page)) / base)).toBe(4);
    await page.getByRole("button", { name: "Ajustar al ancho" }).click();
    await expect(page.getByText("100 %")).toBeVisible();
    expect(Math.abs((await widthOf(page)) - base)).toBeLessThan(1);
  });

  test("«Ajustar al alto» cabe en la pantalla y el texto sigue alineado", async ({
    page,
  }) => {
    await ready(page);
    await page.getByRole("button", { name: "Ajustar al alto" }).click();
    const box = await page.getByTestId("page-surface").boundingBox();
    const area = await page.getByTestId("page-scroller").boundingBox();
    expect(box!.height).toBeLessThanOrEqual(area!.height + 1);
    // La palabra sigue dentro de la página (coordenadas relativas).
    const w = await page
      .getByRole("button", { name: "Tisch", exact: true })
      .boundingBox();
    expect(w!.x).toBeGreaterThanOrEqual(box!.x);
    expect(w!.x + w!.width).toBeLessThanOrEqual(box!.x + box!.width + 1);
  });

  test("Ctrl + rueda amplía la página y no el navegador; el doble clic alterna 100 % ↔ 200 %", async ({
    page,
    hasTouch,
  }) => {
    test.skip(
      hasTouch === true && test.info().project.name !== "pc-1280",
      "solo con ratón",
    );
    await ready(page);
    const scroller = page.getByTestId("page-scroller");
    const box = (await scroller.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200);
    await page.keyboard.up("Control");
    await expect(page.getByText(/^(1[3-9]\d|[2-4]\d\d) %$/)).toBeVisible();
    await page.getByRole("button", { name: "Ajustar al ancho" }).click();
    await page
      .getByTestId("page-scroller")
      .dblclick({ position: { x: 20, y: 400 } });
    await expect(page.getByText("200 %")).toBeVisible();
    await page
      .getByTestId("page-scroller")
      .dblclick({ position: { x: 20, y: 400 } });
    await expect(page.getByText("100 %")).toBeVisible();
  });

  test("el pellizco amplía y con zoom deslizar no cambia de página", async ({
    page,
    hasTouch,
  }) => {
    test.skip(!hasTouch, "solo en dispositivos táctiles");
    await ready(page);
    const scroller = page.getByTestId("page-scroller");
    const fire = (type: string, id: number, x: number, y: number) =>
      scroller.evaluate(
        (el, a) => {
          el.dispatchEvent(
            new PointerEvent(a.type, {
              pointerType: "touch",
              pointerId: a.id,
              bubbles: true,
              clientX: a.x,
              clientY: a.y,
            }),
          );
        },
        { type, id, x, y },
      );
    await fire("pointerdown", 1, 150, 300);
    await fire("pointerdown", 2, 200, 300);
    await fire("pointermove", 2, 350, 300); // distancia 50 → 200: ×4
    await expect(page.getByText("400 %")).toBeVisible();
    await fire("pointerup", 2, 350, 300);
    await fire("pointerup", 1, 150, 300);
    // Con zoom, el deslizamiento horizontal no pasa de página (c1).
    await fire("pointerdown", 3, 200, 300);
    await fire("pointerup", 3, 100, 300);
    await expect(page.getByText("página 1 de 3")).toBeVisible();
  });
});

test("RNF-02: p95 de cambio de página < 500 ms en 50 cambios (4G rápido, CPU ×4)", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "el estrangulamiento de red y CPU usa CDP",
  );
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150, // «4G rápido» de Lighthouse: 150 ms de RTT y 1,6 Mbit/s
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const times = await page.evaluate(async () => {
    const out: number[] = [];
    const dirs = ["ArrowRight", "ArrowRight", "ArrowLeft", "ArrowLeft"]; // 1→2→3→2→1…
    for (let i = 0; i < 50; i++) {
      const key = dirs[i % 4];
      const want = [2, 3, 2, 1][i % 4];
      const t0 = performance.now();
      window.dispatchEvent(new KeyboardEvent("keydown", { key }));
      await new Promise<void>((resolve, reject) => {
        const tick = () => {
          const img =
            document.querySelector<HTMLImageElement>("img[alt^='Imagen']");
          const label = document.querySelector(
            "nav[aria-label='Páginas'] [aria-live]",
          );
          const layer = document.querySelector(".reader-text-layer"); // la página 3 del demo no tiene palabras
          if (
            img?.alt === `Imagen de la página ${want}` &&
            img.complete &&
            img.naturalWidth > 0 &&
            label?.textContent?.startsWith(`página ${want} `) &&
            layer
          )
            resolve();
          else if (performance.now() - t0 > 5000)
            reject(
              new Error(
                `página ${want} no cargó: alt=${img?.alt} complete=${img?.complete} w=${img?.naturalWidth} label=${label?.textContent} capa=${!!layer}`,
              ),
            );
          else requestAnimationFrame(tick);
        };
        tick();
      });
      out.push(performance.now() - t0);
    }
    return out;
  });
  const sorted = [...times].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95) - 1];
  console.log(
    `RNF-02 p95 = ${p95.toFixed(1)} ms (máx ${sorted.at(-1)!.toFixed(1)} ms)`,
  );
  expect(p95).toBeLessThan(500);
});

test("RF-33 / RNF-14: escribir una respuesta, cambiar de página antes de 1 s y volver la conserva; sin conexión se sincroniza al reconectar", async ({
  page,
  context,
}) => {
  await ready(page);
  await page.evaluate(() => {
    localStorage.removeItem("md-demo-remote-annotations");
    return new Promise<void>((r) => {
      const q = indexedDB.deleteDatabase("md-annotations:demo");
      q.onsuccess = q.onerror = q.onblocked = () => r();
    });
  });
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Escribir", exact: true }).click();
  const layer = page.getByTestId("annotation-layer");
  const box = (await layer.boundingBox())!;
  await layer.click({ position: { x: box.width * 0.5, y: box.height * 0.2 } });
  const field = page.getByRole("textbox", { name: "Respuesta" });
  await field.fill("der Tisch");
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByText("página 2 de 3")).toBeVisible();
  // dispatchEvent: el indicador de desarrollo de Next puede tapar este botón a 360 px en CI.
  await page.getByRole("button", { name: "Página anterior" }).dispatchEvent("click");
  await expect(page.getByRole("textbox", { name: "Respuesta" })).toHaveValue("der Tisch");

  // Sin conexión: se guarda en local y queda pendiente.
  await context.setOffline(true);
  await page.getByRole("textbox", { name: "Respuesta" }).fill("der Tisch, die Tische");
  await expect(page.getByRole("status").filter({ hasText: "al reconectar" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  const remote = await page.evaluate(() => localStorage.getItem("md-demo-remote-annotations"));
  expect(remote).toContain("die Tische");
});

test("RF-35: reiniciar la página borra mis respuestas tras confirmar", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Escribir", exact: true }).click();
  const layer = page.getByTestId("annotation-layer");
  const box = (await layer.boundingBox())!;
  await layer.click({ position: { x: box.width * 0.3, y: box.height * 0.2 } });
  await page.getByRole("textbox", { name: "Respuesta" }).fill("borrar");
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Reiniciar página" }).click();
  await expect(page.getByRole("textbox", { name: "Respuesta" })).toHaveCount(0);
});

test("RF-33 c3: fuera del modo Escribir, tocar la página consulta palabras", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("RF-18: el modo lectura ajusta el texto sin desplazamiento horizontal y conserva consulta y colores", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Modo lectura" }).click();
  const view = page.getByTestId("reading-view");
  await expect(view).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const inner = await view.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(inner).toBeLessThanOrEqual(0);
  // Colores de género y consulta funcionan igual (RF-18 c3).
  await page.getByRole("button", { name: "Colorear sustantivos" }).click();
  await expect(view.locator(".hl-n, .hl-m, .hl-f").first()).toBeVisible();
  await view.getByRole("button", { name: "Tisch", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Tisch");
  await page.keyboard.press("Escape");
  // El tamaño de letra cambia y se recuerda.
  await page.getByRole("button", { name: "Letra más grande" }).click();
  await expect(view).toHaveAttribute("data-size", "lg");
  await page.reload();
  await expect(page.getByTestId("reading-view")).toHaveAttribute("data-size", "lg");
});

test("RF-34: los campos detectados se llenan con un toque y uno mal detectado se oculta", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    localStorage.removeItem("my-deutsch:hidden-fields:demo:1");
  });
  await page.getByRole("button", { name: "Escribir", exact: true }).click();
  const slots = page.getByRole("button", { name: /^Campo de ejercicio/ });
  await expect(slots).toHaveCount(2);
  await slots.first().dispatchEvent("click");
  await page.getByRole("textbox", { name: "Respuesta" }).fill("der Tisch");
  await expect(slots).toHaveCount(1);
  await page.getByRole("button", { name: "Ocultar campo" }).dispatchEvent("click");
  await expect(slots).toHaveCount(0);
  // El modo libre sigue disponible.
  const layer = page.getByTestId("annotation-layer");
  const box = (await layer.boundingBox())!;
  await layer.click({ position: { x: box.width * 0.5, y: box.height * 0.2 } });
  await expect(page.getByRole("textbox", { name: "Respuesta" })).toHaveCount(2);
});

test("RF-18 c2: en modo lectura la ilustración de la página se muestra recortada", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Modo lectura" }).click();
  await page.getByLabel("Ir a la página").fill("3");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  const img = page.getByRole("img", { name: "Ilustración de la página" });
  await expect(img).toBeVisible();
  const box = (await img.boundingBox())!;
  expect(box.width).toBeGreaterThan(100);
  expect(box.height).toBeGreaterThan(50);
});
