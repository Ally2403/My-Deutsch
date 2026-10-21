"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Avisa al service worker de la usuaria actual (o de que no hay sesión → purga). RF-50 c3. */
function tell(target: ServiceWorker | null | undefined, userId: string | null) {
  if (!target) return;
  target.postMessage(userId ? { type: "user", id: userId } : { type: "purge" });
}

/**
 * RF-50 · ADR-008: registra `/sw.js` (solo en producción), le informa quién tiene la sesión y
 * muestra «Hay una versión nueva · Actualizar» sin recargar a la fuerza.
 */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  // Solo se recarga tras pulsar «Actualizar»; la primera instalación no debe recargar la página.
  const updating = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;
    const sw = navigator.serviceWorker;
    // «Versión nueva» solo si ya había un service worker al abrir la página: en la primera visita
    // WebKit ya reporta controlador cuando termina de instalarse y no hay nada que actualizar.
    const hadController = !!sw.controller;
    let userId: string | null = null;

    const sync = () => {
      void sw.ready.then((reg) => tell(reg.active, userId));
    };

    const onControllerChange = () => {
      if (!updating.current) return;
      updating.current = false;
      window.location.reload();
    };
    sw.addEventListener("controllerchange", onControllerChange);

    void sw
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        const watch = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && hadController)
              setWaiting(worker);
          });
        };
        if (reg.waiting && hadController) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => watch(reg.installing));
      })
      .catch(() => {
        // Sin service worker la app sigue funcionando; solo se pierde la lectura sin conexión.
      });

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user.id ?? null;
      sync();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      userId = session?.user.id ?? null;
      sync();
    });

    return () => {
      sub.subscription.unsubscribe();
      sw.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-card border border-border bg-surface p-3"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <span className="text-sm">Hay una versión nueva</span>
      <button
        type="button"
        className="btn btn-primary !px-4 text-sm"
        onClick={() => {
          updating.current = true;
          waiting.postMessage({ type: "skip-waiting" });
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
