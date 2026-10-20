import {
  percentRead,
  positionPercent,
  progressLabel,
} from "@/lib/domain/progress";

/**
 * RF-49: barra fina con dos capas (páginas leídas y posición actual) y el texto
 * «Pág. X de Y · Z % leído». No es interactiva.
 */
export function ReadingProgress({
  page,
  total,
  pagesRead,
  showText = true,
  className = "",
}: {
  page: number;
  total: number;
  pagesRead: number[];
  showText?: boolean;
  className?: string;
}) {
  const label = progressLabel(page, total, pagesRead);
  const read = percentRead(pagesRead, total);
  return (
    <div className={`min-w-0 ${className}`}>
      <div
        role="progressbar"
        aria-label="Avance de lectura"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={read}
        aria-valuetext={label}
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-accent-soft"
      >
        <div
          data-testid="progress-position"
          className="absolute inset-y-0 left-0 bg-border"
          style={{ width: `${positionPercent(page, total)}%` }}
        />
        <div
          data-testid="progress-read"
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${read}%` }}
        />
      </div>
      {showText && <p className="mt-1 text-xs text-muted">{label}</p>}
    </div>
  );
}
