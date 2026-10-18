import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookHeader } from "./book-header";

describe("BookHeader (RF-14, RNF-15)", () => {
  it("respeta la muesca de iPhone (safe-area-inset-top) y conserva el enlace táctil", () => {
    render(
      <BookHeader backHref="/grupos/g1" title="Mi libro">
        <p>hijo</p>
      </BookHeader>,
    );
    const header = screen.getByRole("banner");
    expect(header.className).toContain("env(safe-area-inset-top)");
    const link = screen.getByRole("link", { name: /Biblioteca/ });
    expect(link).toHaveAttribute("href", "/grupos/g1");
    expect(link.className).toContain("min-h-11");
    expect(
      screen.getByRole("heading", { name: "Mi libro" }),
    ).toBeInTheDocument();
    expect(screen.getByText("hijo")).toBeInTheDocument();
  });
});
