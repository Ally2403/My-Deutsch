"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Input, OutlineButton } from "@/components/ui";
import {
  apiErrorMessage,
  looksLikeSessionLoss,
  validatePdfFile,
  validateTitle,
} from "@/lib/domain/upload";
import { createClient } from "@/lib/supabase/client";
import { isObjectAlreadyExists } from "@/lib/upload/tus-errors";
import {
  startResumableUpload,
  type UploadHandle,
} from "@/lib/upload/resumable";

/**
 * RF-11 (c2, c5), RNF-11: subida reanudable. El avance se recuerda en
 * localStorage por grupo para que, tras recargar, el MISMO archivo reanude con
 * el mismo objectName y no se cree una segunda solicitud (submit_book).
 *
 * La clave se borra cuando la solicitud termina bien (finalizar 200) o la API
 * la rechaza de forma definitiva (400/404/409/422) o la RPC dice que el
 * archivo/título/permiso no sirven. Se conserva ante errores transitorios
 * (red, 401, 429, 500) y ante 502 dispatch_failed (el libro ya está en cola).
 */

type Pending = {
  name: string;
  size: number;
  lastModified: number;
  objectName: string;
  uploaded: boolean;
  submissionId?: string;
};

const storageKey = (groupId: string) => `my-deutsch:upload:${groupId}`;

function loadPending(groupId: string): Pending | null {
  try {
    const raw = localStorage.getItem(storageKey(groupId));
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

function savePending(groupId: string, p: Pending) {
  try {
    localStorage.setItem(storageKey(groupId), JSON.stringify(p));
  } catch {
    // Sin almacenamiento la página sigue funcionando (sin reanudar tras recargar).
  }
}

function clearPending(groupId: string) {
  try {
    localStorage.removeItem(storageKey(groupId));
  } catch {
    // ver savePending
  }
}

const matches = (p: Pending | null, f: File): p is Pending =>
  !!p &&
  p.name === f.name &&
  p.size === f.size &&
  p.lastModified === f.lastModified &&
  typeof p.objectName === "string";

const RPC_DEFINITIVE = new Set([
  "upload_missing",
  "forbidden",
  "invalid_title",
]);
const RPC_KNOWN = new Set(["busy", ...RPC_DEFINITIVE]);
// Alineado con STATUS de app/api/libros/finalizar/route.ts: 401 y 500 son
// transitorios; el resto cierra la solicitud en el servidor.
const HTTP_DEFINITIVE = new Set([400, 404, 409, 422, 429, 502]);

function rpcMessage(code: string): string {
  if (code === "invalid_title") return "El título no es válido";
  return apiErrorMessage(RPC_KNOWN.has(code) ? code : "");
}

const REUSED_NOTICE = "Este libro ya estaba en la biblioteca; se reutilizó.";

type Phase = "idle" | "uploading" | "saving";

class Cancelled extends Error {}

export function UploadBook({ groupId }: { groupId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<UploadHandle | null>(null);
  const inFlight = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = () => createClient();

  function uploadFile(file: File, objectName: string, accessToken: string) {
    return new Promise<void>((resolve, reject) => {
      const handle = startResumableUpload({
        file,
        objectName,
        accessToken,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        onProgress: (sent, total) =>
          setProgress(total > 0 ? Math.floor((sent / total) * 100) : 0),
        onSuccess: resolve,
        onError: reject,
      });
      handleRef.current = {
        start: handle.start,
        abort: async () => {
          await handle.abort();
          reject(new Cancelled());
        },
      };
      handle.start();
    });
  }

  async function finalize(pending: Pending, submissionId: string) {
    let res: Response;
    try {
      res = await fetch("/api/libros/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId }),
      });
    } catch {
      setError(apiErrorMessage("unexpected"));
      return;
    }
    if (looksLikeSessionLoss(res)) {
      // Sesión perdida (redirección a /login o HTML): no es éxito; se conserva todo para reanudar.
      savePending(groupId, { ...pending, submissionId });
      setError(apiErrorMessage("not_authenticated"));
      return;
    }
    if (res.ok) {
      // RF-51 c6: el servidor reconoció el PDF (misma huella) y reutilizó el libro.
      let reused = false;
      try {
        const body = (await res.json()) as { reused?: unknown };
        reused = body.reused === true;
      } catch {
        // cuerpo no JSON: se trata como libro nuevo
      }
      setNotice(reused ? REUSED_NOTICE : null);
      clearPending(groupId);
      formRef.current?.reset();
      setProgress(0);
      router.refresh();
      return;
    }
    let code = "unexpected";
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body.error === "string") code = body.error;
    } catch {
      // cuerpo no JSON: mensaje genérico
    }
    if (HTTP_DEFINITIVE.has(res.status)) clearPending(groupId);
    else savePending(groupId, { ...pending, submissionId });
    if (res.status === 502) {
      // El libro ya quedó registrado y en cola: se reintenta desde la biblioteca.
      formRef.current?.reset();
      setProgress(0);
      router.refresh();
    }
    // 409 not_pending: el libro ya existe (otra pestaña o intento anterior); se actualiza la lista.
    if (res.status === 409 && code === "not_pending") router.refresh();
    setError(apiErrorMessage(code));
  }

  async function register(pending: Pending, title: string) {
    const { data, error: rpcError } = await supabase().rpc("submit_book", {
      p_group: groupId,
      p_title: title,
      p_upload_path: pending.objectName,
    });
    if (rpcError || !data) {
      const code = rpcError?.message ?? "";
      if (RPC_DEFINITIVE.has(code)) clearPending(groupId);
      setError(rpcMessage(code));
      return;
    }
    const next = { ...pending, uploaded: true, submissionId: data };
    savePending(groupId, next);
    await finalize(next, data);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const titleCheck = validateTitle(titleRef.current?.value ?? "");
    if (!titleCheck.ok) return setError(titleCheck.message);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Elige un archivo PDF");

    inFlight.current = true;
    setError(null);
    setNotice(null);
    setPhase("saving");
    try {
      const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      const fileCheck = validatePdfFile({ size: file.size, head });
      if (!fileCheck.ok) return setError(fileCheck.message);

      const { data } = await supabase().auth.getSession();
      const session = data.session;
      if (!session) return setError(apiErrorMessage("not_authenticated"));

      const stored = loadPending(groupId);
      let pending: Pending = matches(stored, file)
        ? stored
        : {
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            objectName: `${session.user.id}/${crypto.randomUUID()}.pdf`,
            uploaded: false,
          };
      savePending(groupId, pending);

      if (pending.submissionId)
        return await finalize(pending, pending.submissionId);

      if (!pending.uploaded) {
        setProgress(0);
        setPhase("uploading");
        try {
          await uploadFile(file, pending.objectName, session.access_token);
        } catch (err) {
          // 409: la subida anterior sí terminó en el servidor; se sigue a submit_book.
          if (!isObjectAlreadyExists(err)) {
            if (!(err instanceof Cancelled))
              setError(
                "No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo",
              );
            return;
          }
        } finally {
          handleRef.current = null;
        }
        pending = { ...pending, uploaded: true };
        savePending(groupId, pending);
        setPhase("saving");
      }
      await register(pending, titleCheck.title);
    } catch {
      setError(apiErrorMessage("unexpected"));
    } finally {
      inFlight.current = false;
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      aria-busy={phase === "saving"}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1">
        Título
        <Input ref={titleRef} name="title" maxLength={200} disabled={busy} />
      </label>
      <label className="flex flex-col gap-1">
        Archivo PDF
        <Input
          ref={fileRef}
          name="file"
          type="file"
          accept="application/pdf"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent"
          aria-describedby="upload-help"
          disabled={busy}
        />
      </label>
      <p id="upload-help" className="text-sm opacity-70">
        PDF de hasta 50 MB. Si se corta la conexión, la subida continúa donde se
        quedó.
      </p>
      {phase === "uploading" && (
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-label="Progreso de subida"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded bg-border"
          >
            <div
              className="h-full bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm">{progress} %</span>
        </div>
      )}
      {phase === "saving" && (
        <p role="status" className="text-sm">
          Verificando tu archivo…
        </p>
      )}
      {notice && phase === "idle" && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        Subir libro
      </Button>
      {phase === "uploading" && (
        <OutlineButton
          type="button"
          onClick={() => void handleRef.current?.abort()}
        >
          Cancelar
        </OutlineButton>
      )}
    </form>
  );
}
