import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  refresh: vi.fn(),
  rpc: vi.fn(),
  getSession: vi.fn(),
  start: vi.fn(),
  abort: vi.fn(async () => undefined),
  startArgs: null as null | {
    objectName: string;
    onProgress(a: number, b: number): void;
    onSuccess(): void;
    onError(e: Error): void;
  },
  order: [] as string[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: h.refresh }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: h.rpc, auth: { getSession: h.getSession } }),
}));
vi.mock("@/lib/upload/resumable", () => ({
  startResumableUpload: (args: NonNullable<typeof h.startArgs>) => {
    h.startArgs = args;
    h.order.push("upload");
    return { start: h.start, abort: h.abort };
  },
}));

import { UploadBook } from "./upload-book";

const KEY = "my-deutsch:upload:g1";
const fetchMock = vi.fn();

function pdf(name = "libro.pdf", size?: number) {
  const f = new File(["%PDF-1.7 contenido"], name, {
    type: "application/pdf",
    lastModified: 1000,
  });
  if (size !== undefined) Object.defineProperty(f, "size", { value: size });
  return f;
}

function fill(title: string, file: File | null) {
  fireEvent.change(screen.getByLabelText("Título"), {
    target: { value: title },
  });
  if (file)
    fireEvent.change(screen.getByLabelText("Archivo PDF"), {
      target: { files: [file] },
    });
}

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Subir libro" }));

function finishUpload() {
  return act(async () => {
    h.startArgs!.onSuccess();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.order = [];
  h.startArgs = null;
  localStorage.clear();
  // Si jsdom no trae Blob.arrayBuffer, se polyfillea solo en la prueba.
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function (this: Blob) {
      return new Promise<ArrayBuffer>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as ArrayBuffer);
        r.onerror = () => rej(r.error);
        r.readAsArrayBuffer(this);
      });
    };
  }
  h.getSession.mockResolvedValue({
    data: { session: { access_token: "tok", user: { id: "uid-1" } } },
  });
  h.rpc.mockImplementation(async () => {
    h.order.push("rpc");
    return { data: "sub-1", error: null };
  });
  fetchMock.mockImplementation(async () => {
    h.order.push("fetch");
    return new Response(
      JSON.stringify({ book_id: "b1", reused: false, status: "pending" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
});

describe("UploadBook", () => {
  it("nombra el límite y asocia etiquetas", () => {
    render(<UploadBook groupId="g1" />);
    expect(screen.getByText(/PDF de hasta 50 MB/)).toBeInTheDocument();
    expect(screen.getByLabelText("Archivo PDF")).toHaveAttribute(
      "accept",
      "application/pdf",
    );
  });

  it("título vacío: mensaje y no sube", async () => {
    render(<UploadBook groupId="g1" />);
    fill("   ", pdf());
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Escribe un título",
    );
    expect(h.startArgs).toBeNull();
  });

  it("sin archivo: mensaje", async () => {
    render(<UploadBook groupId="g1" />);
    fill("Título", null);
    submit();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(h.startArgs).toBeNull();
  });

  it("no PDF, vacío o de 51 MB: mensaje y no sube", async () => {
    render(<UploadBook groupId="g1" />);
    fill("T", new File(["hola mundo"], "x.pdf"));
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("no es un PDF");
    fill("T", new File([], "v.pdf"));
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("vacío"),
    );
    fill("T", pdf("g.pdf", 51 * 1024 * 1024));
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("50 MB"),
    );
    expect(h.startArgs).toBeNull();
  });

  it("flujo feliz: upload, rpc, finalizar, refresh y limpia la clave", async () => {
    render(<UploadBook groupId="g1" />);
    fill("  Mi libro ", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    expect(h.startArgs!.objectName).toMatch(/^uid-1\/[0-9a-f-]{36}\.pdf$/);
    expect(localStorage.getItem(KEY)).toContain(h.startArgs!.objectName);
    await finishUpload();
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
    expect(h.order).toEqual(["upload", "rpc", "fetch"]);
    expect(h.rpc).toHaveBeenCalledWith("submit_book", {
      p_group: "g1",
      p_title: "Mi libro",
      p_upload_path: h.startArgs!.objectName,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/libros/finalizar",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ submission_id: "sub-1" }),
      }),
    );
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByLabelText("Título")).toHaveValue("");
  });

  it("RF-51: libro reutilizado muestra el aviso; uno nuevo no", async () => {
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({ book_id: "b1", reused: true, status: "ready" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    render(<UploadBook groupId="g1" />);
    fill("Mi libro", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Este libro ya estaba en la biblioteca; se reutilizó.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("RF-51: libro nuevo no muestra el aviso de reutilizado", async () => {
    render(<UploadBook groupId="g1" />);
    fill("Mi libro", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
    expect(screen.queryByText(/se reutilizó/)).toBeNull();
  });

  it("busy de la RPC muestra el texto exacto y conserva la subida hecha", async () => {
    h.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "busy", code: "P0001" },
    });
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Espera a que termine tu libro actual",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    // Reintento: no vuelve a subir, solo registra.
    h.startArgs = null;
    submit();
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
    expect(h.startArgs).toBeNull();
  });

  it("error desconocido de Postgres no muestra texto crudo", async () => {
    h.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "x" does not exist', code: "42P01" },
    });
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("relation");
    expect(alert).toHaveTextContent("No se pudo completar");
  });

  it("busy del API (429) muestra el texto exacto, limpia la clave y permite subir de nuevo", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "busy" }), { status: 429 }),
    );
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    const first = h.startArgs!.objectName;
    await finishUpload();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Espera a que termine tu libro actual",
    );
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(h.refresh).not.toHaveBeenCalled();
    h.startArgs = null;
    submit();
    await waitFor(() => expect(h.startArgs).not.toBeNull());
    expect(h.startArgs!.objectName).not.toBe(first);
  });

  it("409 not_pending es definitivo: limpia la clave", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not_pending" }), { status: 409 }),
    );
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ya fue procesada",
    );
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("401 de finalizar: sesión caducada, conserva la clave y el formulario", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<UploadBook groupId="g1" />);
    fill("Mi título", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu sesión caducó. Vuelve a iniciar sesión",
    );
    expect(localStorage.getItem(KEY)).toContain("sub-1");
    expect(screen.getByLabelText("Título")).toHaveValue("Mi título");
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it.each([
    [
      "respuesta redirigida (a /login)",
      () => {
        const r = new Response("<html>login</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
        Object.defineProperty(r, "redirected", { value: true });
        return r;
      },
    ],
    [
      "200 con HTML",
      () =>
        new Response("<html>login</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    ],
  ])(
    "%s no se toma como éxito: conserva clave y formulario",
    async (_n, make) => {
      fetchMock.mockResolvedValueOnce(make());
      render(<UploadBook groupId="g1" />);
      fill("Mi título", pdf());
      submit();
      await waitFor(() => expect(h.start).toHaveBeenCalled());
      await finishUpload();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Tu sesión caducó. Vuelve a iniciar sesión",
      );
      expect(localStorage.getItem(KEY)).toContain("sub-1");
      expect(screen.getByLabelText("Título")).toHaveValue("Mi título");
      expect(h.refresh).not.toHaveBeenCalled();
    },
  );

  it("mientras finalizar tarda muestra «Verificando tu archivo…» y aria-busy", async () => {
    fetchMock.mockImplementationOnce(() => new Promise(() => undefined));
    const { container } = render(<UploadBook groupId="g1" />);
    expect(container.querySelector("form")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    expect(
      await screen.findByText("Verificando tu archivo…"),
    ).toBeInTheDocument();
    expect(container.querySelector("form")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("button", { name: "Subir libro" })).toBeDisabled();
  });

  it("409 not_pending refresca la biblioteca (el libro ya existe)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not_pending" }), { status: 409 }),
    );
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    await screen.findByRole("alert");
    expect(h.refresh).toHaveBeenCalled();
  });

  it("500 de finalizar es transitorio: conserva la clave", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "unexpected" }), { status: 500 }),
    );
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    await screen.findByRole("alert");
    expect(localStorage.getItem(KEY)).toContain("sub-1");
  });

  it("502 dispatch_failed: limpia clave y formulario, refresca y no vuelve a llamar a finalizar", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "dispatch_failed" }), {
        status: 502,
      }),
    );
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    expect(await screen.findByRole("alert")).toHaveTextContent("Reintentar");
    expect(h.refresh).toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("409 de TUS (objeto ya existe) cuenta como subido y sigue a submit_book", async () => {
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await act(async () => {
      h.startArgs!.onError(
        Object.assign(new Error("tus: unexpected response"), {
          originalResponse: { getStatus: () => 409 },
        }),
      );
    });
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("doble toque llama a submit_book una sola vez", async () => {
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(h.start).toHaveBeenCalledTimes(1);
  });

  it("mientras sube: campos y botón deshabilitados y barra con progreso", async () => {
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    act(() => h.startArgs!.onProgress(25, 100));
    expect(screen.getByLabelText("Título")).toBeDisabled();
    expect(screen.getByLabelText("Archivo PDF")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Subir libro" })).toBeDisabled();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("cancelar aborta y vuelve a habilitar conservando la clave", async () => {
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(h.abort).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByLabelText("Título")).toBeEnabled());
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it("tras recargar, el mismo archivo reanuda con el mismo objectName", async () => {
    const first = render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    const name = h.startArgs!.objectName;
    first.unmount();
    h.startArgs = null;
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.startArgs).not.toBeNull());
    expect(h.startArgs!.objectName).toBe(name);
  });

  it("un archivo distinto usa un objectName nuevo", async () => {
    const first = render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    const name = h.startArgs!.objectName;
    first.unmount();
    render(<UploadBook groupId="g1" />);
    fill("T", pdf("otro.pdf"));
    submit();
    await waitFor(() => expect(h.startArgs!.objectName).not.toBe(name));
  });

  it("funciona sin localStorage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    await finishUpload();
    await waitFor(() => expect(h.refresh).toHaveBeenCalled());
    vi.restoreAllMocks();
  });

  it("error de subida se muestra y rehabilita", async () => {
    render(<UploadBook groupId="g1" />);
    fill("T", pdf());
    submit();
    await waitFor(() => expect(h.start).toHaveBeenCalled());
    act(() => h.startArgs!.onError(new Error("red")));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo subir el archivo",
    );
    expect(screen.getByLabelText("Título")).toBeEnabled();
  });
});
