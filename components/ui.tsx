import type { ComponentProps, ReactNode } from "react";

const field =
  "block w-full min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-base";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${field} ${className}`} />;
}

export function Button({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-lg bg-accent px-4 py-2 text-base font-medium text-background disabled:opacity-60 ${className}`}
    />
  );
}

export function OutlineButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-lg border border-border px-4 py-2 text-base font-medium ${className}`}
    />
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">{children}</main>
  );
}
