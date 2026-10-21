import { describe, expect, it, vi } from "vitest";
import { createPageCache } from "./page-cache";

const fetcher = () =>
  vi.fn((n: number) => Promise.resolve({ n }) as Promise<{ n: number }>);

describe("createPageCache (RNF-19)", () => {
  it("no vuelve a pedir una página ya precargada", async () => {
    const f = fetcher();
    const c = createPageCache(f);
    c.prefetch([2, 3]);
    await c.get(2);
    await c.get(2);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("dos get simultáneos hacen una sola petición", async () => {
    const f = fetcher();
    const c = createPageCache(f);
    const [a, b] = await Promise.all([c.get(1), c.get(1)]);
    expect(a).toBe(b);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("expulsa la menos reciente al pasar del máximo", async () => {
    const f = fetcher();
    const c = createPageCache(f, 2);
    await c.get(1);
    await c.get(2);
    await c.get(1); // 1 pasa a ser la más reciente
    await c.get(3); // expulsa 2
    f.mockClear();
    await c.get(1);
    expect(f).not.toHaveBeenCalled();
    await c.get(2);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("un error de red no envenena la caché", async () => {
    const f = vi
      .fn<(n: number) => Promise<{ n: number }>>()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValue({ n: 1 });
    const c = createPageCache(f);
    await expect(c.get(1)).rejects.toThrow("red");
    await expect(c.get(1)).resolves.toEqual({ n: 1 });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("prefetch ignora errores", async () => {
    const f = vi.fn().mockRejectedValue(new Error("x"));
    const c = createPageCache(f);
    expect(() => c.prefetch([1])).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});
