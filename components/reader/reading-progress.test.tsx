import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReadingProgress } from "./reading-progress";

describe("ReadingProgress (RF-49)", () => {
  it("es una barra de progreso con valor y texto accesibles", () => {
    const read = Array.from({ length: 33 }, (_, i) => i + 1);
    render(<ReadingProgress page={34} total={167} pagesRead={read} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "20");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute(
      "aria-valuetext",
      "Pág. 34 de 167 · 20 % leído",
    );
    expect(screen.getByText("Pág. 34 de 167 · 20 % leído")).toBeInTheDocument();
  });

  it("dibuja dos capas: leído y posición actual", () => {
    render(<ReadingProgress page={5} total={10} pagesRead={[1, 2]} />);
    expect(screen.getByTestId("progress-read")).toHaveStyle({ width: "20%" });
    expect(screen.getByTestId("progress-position")).toHaveStyle({
      width: "50%",
    });
  });
});
