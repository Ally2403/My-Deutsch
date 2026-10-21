"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { installMode, type InstallMode } from "@/lib/pwa/install";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

/** RF-50 c5: «Instalar en tu celular» (botón en Android, pasos en iPhone, oculta si ya está instalada). */
export function InstallCard() {
  const [mode, setMode] = useState<InstallMode>("none");
  const [event, setEvent] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const compute = (hasPrompt: boolean) =>
      setMode(
        installMode({
          userAgent: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
          standalone,
          hasPrompt,
        }),
      );
    compute(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as PromptEvent);
      compute(true);
    };
    const onInstalled = () => {
      setEvent(null);
      setMode("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "none" || mode === "installed") return null;

  return (
    <section className="card mt-10 p-5">
      <h2 className="font-display text-lg font-bold">Instalar en tu celular</h2>
      {mode === "prompt" ? (
        <>
          <p className="mt-2 text-muted">
            Ábrela como una app, a pantalla completa y con lo que ya leíste
            disponible sin conexión.
          </p>
          <Button
            type="button"
            className="mt-3"
            onClick={async () => {
              if (!event) return;
              await event.prompt();
              await event.userChoice;
              setEvent(null);
              setMode("none");
            }}
          >
            Instalar la app
          </Button>
        </>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>
            Abre esta página en <strong>Safari</strong>.
          </li>
          <li>
            Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha
            hacia arriba).
          </li>
          <li>
            Elige <strong>Añadir a pantalla de inicio</strong> y confirma.
          </li>
        </ol>
      )}
    </section>
  );
}
