"use client";

import { useState } from "react";
import { OutlineButton } from "@/components/ui";
import { inviteLink } from "@/lib/domain/group";

// RF-06 criterio 2: hoja de compartir nativa en móvil; copiar el enlace en el resto.
export function ShareInvite({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = inviteLink(location.origin, code);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: groupName,
          text: `Únete a ${groupName} en My-Deutsch`,
          url,
        });
        return;
      } catch {
        // Cancelado por la usuaria: no se copia nada.
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Código de invitación</p>
      <p className="font-mono text-2xl font-bold tracking-widest">{code}</p>
      <OutlineButton type="button" onClick={share}>
        {copied ? "Enlace copiado" : "Compartir enlace"}
      </OutlineButton>
    </div>
  );
}
