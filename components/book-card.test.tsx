import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
let deleteResult: { data: unknown[] | null; error: Error | null } = {
  data: [{ book_id: "b1" }],
  error: null,
};
const filters: [string, string][] = [];
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      delete: () => {
        const chain = {
          eq: (c: string, v: string) => {
            filters.push([c, v]);
            return chain;
          },
          select: async () => deleteResult,
        };
        return chain;
      },
    }),
  }),
}));

import { BookCard } from "./book-card";

const base = {
  id: "b1",
  title: "Menschen B1",
  pageCount: 120 as number | null,
  hasPublishedPages: true,
  canRetry: false,
  status: {
    bookStatus: "ready",
    jobStatus: "ready",
    pagesDone: 120,
    pageCount: 120 as number | null,
    error: null,
  },
};

describe("BookCard (RF-13, RF-14)", () => {
  it("portada perezosa con alt vacío y relación de aspecto fija", () => {
    const { container } = render(<BookCard {...base} />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "/api/libros/b1/paginas/1/imagen");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("alt", "");
    expect(img.parentElement?.getAttribute("style")).toContain(
      "aspect-ratio: 1600 / 2263",
    );
  });

  it("si la imagen falla muestra la inicial del título", () => {
    const { container } = render(<BookCard {...base} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("muestra el porcentaje leído real (RF-20)", () => {
    const read = Array.from({ length: 42 }, (_, i) => i + 1);
    render(<BookCard {...base} pagesRead={read} lastPage={43} />);
    expect(screen.getByText("Pág. 43 de 120 · 35 % leído")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Avance de lectura" }),
    ).toHaveAttribute("aria-valuenow", "35");
  });

  it("sin páginas publicadas no pide imagen y muestra la inicial", () => {
    const { container } = render(
      <BookCard {...base} hasPublishedPages={false} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("«N páginas» solo si page_count existe; 0 % leído por omisión", () => {
    const { unmount } = render(<BookCard {...base} />);
    expect(screen.getByText("120 páginas")).toBeInTheDocument();
    expect(screen.getByText("Pág. 1 de 120 · 0 % leído")).toBeInTheDocument();
    unmount();
    render(<BookCard {...base} pageCount={null} />);
    expect(screen.queryByText(/\d+ páginas$/)).toBeNull();
    expect(screen.getByText("0 % leído")).toBeInTheDocument();
  });

  it("enlace al lector con páginas publicadas o libro listo", () => {
    const { unmount } = render(<BookCard {...base} />);
    expect(screen.getByRole("link", { name: /Menschen B1/ })).toHaveAttribute(
      "href",
      "/libros/b1",
    );
    unmount();
    render(<BookCard {...base} hasPublishedPages={false} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/libros/b1");
  });

  it("enlace con páginas publicadas aunque el libro siga procesando", () => {
    render(
      <BookCard
        {...base}
        status={{ ...base.status, bookStatus: "processing", pagesDone: 5 }}
      />,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/libros/b1");
  });

  it("sin enlace con cero páginas y libro no listo", () => {
    render(
      <BookCard
        {...base}
        hasPublishedPages={false}
        status={{ ...base.status, bookStatus: "queued", pagesDone: 0 }}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Menschen B1")).toBeInTheDocument();
  });

  it("nunca anida el botón Reintentar dentro de un enlace", () => {
    const { container } = render(
      <BookCard
        {...base}
        canRetry
        status={{
          ...base.status,
          bookStatus: "error",
          jobStatus: "error",
          error: "invalid_pdf",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reintentar" }),
    ).toBeInTheDocument();
    expect(container.querySelector("a button, a a, button a")).toBeNull();
  });
});

describe("BookCard: quitar libro del grupo (RF-15)", () => {
  const withRemove = { ...base, groupId: "g1", canRemove: true };

  it("sin permiso no ofrece quitar", () => {
    render(<BookCard {...base} groupId="g1" canRemove={false} />);
    expect(
      screen.queryByRole("button", { name: "Quitar del grupo" }),
    ).toBeNull();
  });

  it("pide confirmación, explica los 7 días y borra solo el vínculo con este grupo", async () => {
    refresh.mockClear();
    filters.length = 0;
    deleteResult = { data: [{ book_id: "b1" }], error: null };
    render(<BookCard {...withRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar del grupo" }));
    expect(screen.getByText(/7 días/)).toBeInTheDocument();
    expect(
      screen.getByText(/palabras guardadas se conservan/),
    ).toBeInTheDocument();
    expect(filters).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar libro" }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(filters).toEqual([
      ["group_id", "g1"],
      ["book_id", "b1"],
    ]);
  });

  it("cancelar no borra; si RLS no borra ninguna fila avisa del error", async () => {
    refresh.mockClear();
    deleteResult = { data: [], error: null };
    render(<BookCard {...withRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar del grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(
      screen.getByRole("button", { name: "Quitar del grupo" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar del grupo" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, quitar libro" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo quitar el libro",
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
