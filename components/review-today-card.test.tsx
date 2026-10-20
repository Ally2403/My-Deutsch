import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewTodayCard } from "./review-today-card";

const soon = () => new Date(Date.now() - 3_600_000).toISOString();
const later = () => new Date(Date.now() + 20 * 86_400_000).toISOString();

describe("RF-48 c2: «Repaso de hoy»", () => {
  it("muestra cuántas hay para repasar y cuántas nuevas, con enlace a /repaso", () => {
    render(
      <ReviewTodayCard
        words={[
          { id: 1, known: false },
          { id: 2, known: false },
          { id: 3, known: false },
        ]}
        cards={[{ id: 1, due: soon() }]}
        recentLogs={[]}
      />,
    );
    expect(screen.getByText("Hoy: 1 para repasar · 2 nuevas")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Repasar" });
    expect(link.getAttribute("href")).toBe("/repaso");
  });

  it("«Estás al día» cuando no hay nada pendiente", () => {
    render(
      <ReviewTodayCard
        words={[{ id: 1, known: false }]}
        cards={[{ id: 1, due: later() }]}
        recentLogs={[]}
      />,
    );
    expect(screen.getByText("Estás al día")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Repasar" })).toBeNull();
  });

  it("sin palabras invita a leer", () => {
    render(<ReviewTodayCard words={[]} cards={[]} recentLogs={[]} />);
    expect(screen.getByText(/Lee un libro/)).toBeTruthy();
  });

  it("las palabras conocidas no cuentan", () => {
    render(
      <ReviewTodayCard
        words={[{ id: 1, known: true }]}
        cards={[]}
        recentLogs={[]}
      />,
    );
    expect(screen.getByText("Estás al día")).toBeTruthy();
  });

  it("descuenta lo ya hecho hoy del límite de nuevas", () => {
    const now = new Date();
    const words = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      known: false,
    }));
    // Una reseña de tarjeta nueva hecha hace un minuto: cuenta para el límite si es del día de estudio.
    const log = {
      reviewedAt: new Date(now.getTime() - 60_000).toISOString(),
      stateBefore: 0,
    };
    render(<ReviewTodayCard words={words} cards={[]} recentLogs={[log]} />);
    const hour = now.getHours();
    // Antes de las 04:00 el minuto anterior sigue en el mismo día de estudio salvo a las 04:00 justas.
    expect(
      screen.getByText(
        hour === 4 && now.getMinutes() === 0
          ? "Hoy: 0 para repasar · 10 nuevas"
          : "Hoy: 0 para repasar · 9 nuevas",
      ),
    ).toBeTruthy();
  });
});
