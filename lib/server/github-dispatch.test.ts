// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { dispatchProcessBook, DispatchError } from "./github-dispatch";

const ID = "0b7e5a52-3c1d-4f0a-9d63-2f1c8a4e7b10";
const TOKEN = "ghp_secreto_de_prueba";
const res = (status: number) => new Response(null, { status });

describe("dispatchProcessBook", () => {
  it("dispara workflow_dispatch de process-book.yml con el book_id", async () => {
    const f = vi.fn().mockResolvedValue(res(204));
    await dispatchProcessBook(ID, { token: TOKEN, fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(
      "https://api.github.com/repos/Ally2403/My-Deutsch/actions/workflows/process-book.yml/dispatches",
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "my-deutsch",
    });
    expect(JSON.parse(init.body)).toEqual({
      ref: "main",
      inputs: { book_id: ID },
    });
  });

  it("usa el repositorio indicado", async () => {
    const f = vi.fn().mockResolvedValue(res(204));
    await dispatchProcessBook(ID, {
      token: TOKEN,
      repo: "otra/cosa",
      fetchImpl: f,
    });
    expect(f.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/otra/cosa/actions/workflows/process-book.yml/dispatches",
    );
  });

  it("registra solo el estado HTTP cuando GitHub rechaza (sin token)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const f = vi.fn().mockResolvedValue(res(403));
    await expect(
      dispatchProcessBook(ID, { token: TOKEN, fetchImpl: f }),
    ).rejects.toBeInstanceOf(DispatchError);
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain("403");
    expect(logged).not.toContain(TOKEN);
    spy.mockRestore();
  });

  it.each([404, 422, 500])("estado %i → DispatchError", async (status) => {
    const f = vi.fn().mockResolvedValue(res(status));
    await expect(
      dispatchProcessBook(ID, { token: TOKEN, fetchImpl: f }),
    ).rejects.toBeInstanceOf(DispatchError);
  });

  it("si fetch lanza → DispatchError sin el token en el mensaje", async () => {
    const f = vi.fn().mockRejectedValue(new Error(`boom ${TOKEN}`));
    const p = dispatchProcessBook(ID, { token: TOKEN, fetchImpl: f });
    await expect(p).rejects.toBeInstanceOf(DispatchError);
    await expect(p).rejects.toThrow("dispatch_failed");
    await p.catch((e) => expect(String(e.message)).not.toContain(TOKEN));
  });

  it("sin token no llama a fetch", async () => {
    const f = vi.fn();
    await expect(
      dispatchProcessBook(ID, { token: undefined, fetchImpl: f }),
    ).rejects.toBeInstanceOf(DispatchError);
    expect(f).not.toHaveBeenCalled();
  });

  it("book_id que no es UUID no llama a fetch", async () => {
    const f = vi.fn();
    await expect(
      dispatchProcessBook("x; rm -rf", { token: TOKEN, fetchImpl: f }),
    ).rejects.toBeInstanceOf(DispatchError);
    expect(f).not.toHaveBeenCalled();
  });

  it("repo con formato inválido no llama a fetch", async () => {
    const f = vi.fn();
    await expect(
      dispatchProcessBook(ID, { token: TOKEN, repo: "../x", fetchImpl: f }),
    ).rejects.toBeInstanceOf(DispatchError);
    expect(f).not.toHaveBeenCalled();
  });
});
