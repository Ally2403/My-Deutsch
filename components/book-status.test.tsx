import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookStatusInput } from "@/lib/domain/book-status";
import { RETRY_DISPATCH_FAILED_MESSAGE } from "@/lib/domain/upload";

const h = vi.hoisted(() => ({
  refresh: vi.fn(),
  book: vi.fn(),
  job: vi.fn(),
  from: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: h.refresh }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: h.from }),
}));

import { BookStatus } from "./book-status";

const processing: BookStatusInput = {
  bookStatus: "processing",
  jobStatus: "processing",
  pagesDone: 12,
  pageCount: 200,
  error: null,
};
const errored: BookStatusInput = {
  bookStatus: "error",
  jobStatus: "error",
  pagesDone: 3,
  pageCount: null,
  error: "invalid_pdf",
};

function chain(result: () => Promise<unknown>) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) c[m] = () => c;
  c.maybeSingle = result;
  return c;
}

const fetchMock = vi.fn();
const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  h.refresh.mockReset();
  h.book.mockReset();
  h.job.mockReset();
  h.from.mockReset();
  h.from.mockImplementation((t: string) =>
    chain(t === "books" ? h.book : h.job),
  );
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const serve = (
  book: { status: string; page_count: number | null },
  job: {
    status: string;
    pages_done: number;
    pages_total?: number | null;
    error: string | null;
  } | null,
) => {
  h.book.mockResolvedValue({ data: book, error: null });
  h.job.mockResolvedValue({ data: job, error: null });
};

describe("BookStatus (RF-13)", () => {
  it("procesando muestra etiqueta y barra accesible", () => {
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    expect(screen.getByText("Procesando 12/200 páginas")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "6");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAccessibleName();
  });

  it("sin total no hay barra", () => {
    render(
      <BookStatus
        bookId="b1"
        initial={{ ...processing, pageCount: null }}
        canRetry={false}
      />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("sondea cada 10 s, actualiza y refresca al cambiar pagesDone", async () => {
    serve(
      { status: "processing", page_count: 200 },
      { status: "processing", pages_done: 40, error: null },
    );
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    await tick(9_999);
    expect(h.book).not.toHaveBeenCalled();
    await tick(1);
    expect(h.book).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Procesando 40/200 páginas")).toBeInTheDocument();
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it("sin page_count del libro usa jobs.pages_total: Procesando 12/200 con barra", async () => {
    serve(
      { status: "processing", page_count: null },
      { status: "processing", pages_done: 12, pages_total: 200, error: null },
    );
    render(
      <BookStatus
        bookId="b1"
        initial={{ ...processing, pageCount: null }}
        canRetry={false}
      />,
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    await tick(10_000);
    expect(screen.getByText("Procesando 12/200 páginas")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "6");
  });

  it("page_count del libro tiene prioridad sobre jobs.pages_total", async () => {
    serve(
      { status: "processing", page_count: 180 },
      { status: "processing", pages_done: 12, pages_total: 200, error: null },
    );
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    await tick(10_000);
    expect(screen.getByText("Procesando 12/180 páginas")).toBeInTheDocument();
  });

  it("no refresca si nada cambió", async () => {
    serve(
      { status: "processing", page_count: 200 },
      { status: "processing", pages_done: 12, error: null },
    );
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    await tick(10_000);
    expect(h.book).toHaveBeenCalledTimes(1);
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it("al llegar a ready deja de consultar", async () => {
    serve(
      { status: "ready", page_count: 200 },
      { status: "ready", pages_done: 200, error: null },
    );
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    await tick(10_000);
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(h.refresh).toHaveBeenCalled();
    await tick(60_000);
    expect(h.book).toHaveBeenCalledTimes(1);
  });

  it("en error inicial no sondea", async () => {
    render(<BookStatus bookId="b1" initial={errored} canRetry={false} />);
    await tick(60_000);
    expect(h.book).not.toHaveBeenCalled();
  });

  it("si la consulta falla conserva el estado y reintenta en el siguiente ciclo", async () => {
    h.book.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    h.book.mockRejectedValueOnce(new Error("red"));
    h.book.mockResolvedValue({
      data: { status: "processing", page_count: 200 },
      error: null,
    });
    h.job.mockResolvedValue({
      data: { status: "processing", pages_done: 50, error: null },
      error: null,
    });
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    await tick(10_000);
    expect(screen.getByText("Procesando 12/200 páginas")).toBeInTheDocument();
    await tick(10_000);
    expect(screen.getByText("Procesando 12/200 páginas")).toBeInTheDocument();
    await tick(10_000);
    expect(screen.getByText("Procesando 50/200 páginas")).toBeInTheDocument();
  });

  it("ignora respuestas que llegan después de desmontar", async () => {
    let resolve!: (v: unknown) => void;
    h.book.mockReturnValue(new Promise((r) => (resolve = r)));
    h.job.mockResolvedValue({ data: null, error: null });
    const { unmount } = render(
      <BookStatus bookId="b1" initial={processing} canRetry={false} />,
    );
    await tick(10_000);
    unmount();
    await act(async () => {
      resolve({ data: { status: "ready", page_count: 200 }, error: null });
    });
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it("ignora una respuesta vieja que llega después de otra más nueva", async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    h.book.mockImplementation(() => new Promise((r) => resolvers.push(r)));
    h.job.mockResolvedValue({
      data: { status: "processing", pages_done: 0, error: null },
      error: null,
    });
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    await tick(10_000);
    await tick(10_000);
    expect(resolvers).toHaveLength(2);
    await act(async () => {
      resolvers[1]({ data: { status: "ready", page_count: 200 }, error: null });
    });
    await act(async () => {
      resolvers[0]({
        data: { status: "processing", page_count: 200 },
        error: null,
      });
    });
    expect(screen.getByText("Listo")).toBeInTheDocument();
  });

  it("desmontar limpia el intervalo", () => {
    const { unmount } = render(
      <BookStatus bookId="b1" initial={processing} canRetry={false} />,
    );
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("un job superseded no se muestra como error", async () => {
    serve(
      { status: "queued", page_count: null },
      { status: "error", pages_done: 0, error: "superseded" },
    );
    render(
      <BookStatus
        bookId="b1"
        initial={{ ...processing, bookStatus: "queued", pagesDone: 0 }}
        canRetry={false}
      />,
    );
    await tick(10_000);
    expect(screen.getByText("En cola")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("estado en región aria-live polite", () => {
    render(<BookStatus bookId="b1" initial={processing} canRetry={false} />);
    const live = screen
      .getByText("Procesando 12/200 páginas")
      .closest("[aria-live]");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  describe("error y reintento", () => {
    it("muestra el motivo resumido y Reintentar solo con canRetry", () => {
      const { unmount } = render(
        <BookStatus bookId="b1" initial={errored} canRetry={false} />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "El PDF no se pudo leer o está dañado",
      );
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
      unmount();
      render(<BookStatus bookId="b1" initial={errored} canRetry />);
      expect(
        screen.getByRole("button", { name: "Reintentar" }),
      ).toBeInTheDocument();
    });

    it("doble toque hace una sola llamada y deshabilita el botón", async () => {
      let done!: (v: unknown) => void;
      fetchMock.mockReturnValue(new Promise((r) => (done = r)));
      render(<BookStatus bookId="b1" initial={errored} canRetry />);
      const btn = screen.getByRole("button", { name: "Reintentar" });
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/libros/b1/reintentar", {
        method: "POST",
      });
      expect(btn).toBeDisabled();
      await act(async () => {
        done({ ok: true, status: 200, json: async () => ({}) });
      });
    });

    it("200 refresca, pasa a En cola y reanuda el sondeo", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ book_id: "b1", job_id: "j1" }),
      });
      serve(
        { status: "processing", page_count: 10 },
        { status: "processing", pages_done: 1, error: null },
      );
      render(<BookStatus bookId="b1" initial={errored} canRetry />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      });
      expect(h.refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByText("En cola")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
      await tick(10_000);
      expect(h.book).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Procesando 1/10 páginas")).toBeInTheDocument();
    });

    it.each([
      [429, "busy", "Espera a que termine tu libro actual"],
      [
        409,
        "not_retryable",
        "Aún no se puede reintentar. Espera unos minutos e inténtalo de nuevo",
      ],
      [403, "forbidden", "No tienes permiso para hacer esto"],
    ])("%i %s muestra su mensaje y no es éxito", async (status, error, msg) => {
      fetchMock.mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ error }),
      });
      render(<BookStatus bookId="b1" initial={errored} canRetry />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      });
      expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(
        msg,
      );
      expect(h.refresh).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
    });

    it("502 dispatch_failed: el reintento quedó registrado, pasa a En cola, refresca y reanuda el sondeo", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: "dispatch_failed", book_id: "b1" }),
      });
      serve(
        { status: "processing", page_count: 10 },
        { status: "processing", pages_done: 2, error: null },
      );
      render(<BookStatus bookId="b1" initial={errored} canRetry />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      });
      expect(screen.getByText("En cola")).toBeInTheDocument();
      expect(h.refresh).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
      expect(
        screen.getAllByRole("alert").map((a) => a.textContent),
      ).toContain(RETRY_DISPATCH_FAILED_MESSAGE);
      await tick(10_000);
      expect(screen.getByText("Procesando 2/10 páginas")).toBeInTheDocument();
    });

    it("un fallo de red muestra el mensaje inesperado y permite reintentar de nuevo", async () => {
      fetchMock.mockRejectedValue(new Error("red"));
      render(<BookStatus bookId="b1" initial={errored} canRetry />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      });
      expect(screen.getAllByRole("alert").map((a) => a.textContent)).toContain(
        "Ocurrió un error inesperado. Inténtalo de nuevo",
      );
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
    });

    it("libro en cola atascado: Reintentar visible con canRetry", () => {
      vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
      render(
        <BookStatus
          bookId="b1"
          initial={{
            ...errored,
            bookStatus: "queued",
            jobStatus: "queued",
            error: null,
          }}
          canRetry
          jobCreatedAt="2026-10-18T11:50:00Z"
          jobStartedAt={null}
        />,
      );
      expect(screen.getByText("En cola")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Reintentar" }),
      ).toBeInTheDocument();
    });
  });

  describe("cola atascada sin recargar", () => {
    const queuedInit: BookStatusInput = {
      bookStatus: "queued",
      jobStatus: "queued",
      pagesDone: 0,
      pageCount: null,
      error: null,
    };
    const queuedServe = () =>
      serve(
        { status: "queued", page_count: null },
        { status: "queued", pages_done: 0, error: null },
      );

    it("aparece al cumplirse 5 min tras un ciclo de sondeo, sin recargar", async () => {
      vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
      h.job.mockResolvedValue({
        data: {
          status: "queued",
          pages_done: 0,
          error: null,
          created_at: "2026-10-18T11:56:00Z",
          started_at: null,
        },
        error: null,
      });
      h.book.mockResolvedValue({
        data: { status: "queued", page_count: null },
        error: null,
      });
      render(
        <BookStatus
          bookId="b1"
          initial={queuedInit}
          canRetry={false}
          ownerOrAdmin
          jobCreatedAt="2026-10-18T11:56:00Z"
          jobStartedAt={null}
        />,
      );
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
      await tick(10_000);
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
      await tick(60_000 * 2);
      expect(
        screen.getByRole("button", { name: "Reintentar" }),
      ).toBeInTheDocument();
    });

    it("quien no es dueño ni administrador nunca lo ve", async () => {
      vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
      queuedServe();
      render(
        <BookStatus
          bookId="b1"
          initial={queuedInit}
          canRetry={false}
          ownerOrAdmin={false}
          jobCreatedAt="2026-10-18T11:00:00Z"
          jobStartedAt={null}
        />,
      );
      await tick(10_000);
      expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    });
  });
});
