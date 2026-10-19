import type { ComponentProps, ReactNode } from "react";

const field =
  "block w-full min-h-11 rounded-control border border-border bg-surface px-3.5 py-2 text-base shadow-[inset_0_1px_1px_rgb(28_26_38/0.04)] placeholder:text-muted/70 focus:border-accent";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${field} ${className}`} />;
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

type ButtonProps = ComponentProps<"button"> & { loading?: boolean };

export function Button({ className = "", loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 py-2 text-base font-semibold text-on-accent shadow-card disabled:opacity-60 ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function OutlineButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-2 text-base font-semibold disabled:opacity-60 ${className}`}
    />
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 md:max-w-xl">
      {children}
    </main>
  );
}
