import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

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
    render(<BookCard {...base} percentRead={35} />);
    expect(screen.getByText("35 % leído")).toBeInTheDocument();
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
    expect(screen.getByText("0 % leído")).toBeInTheDocument();
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
