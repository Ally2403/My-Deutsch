const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Los segmentos no pueden ser solo puntos ("..") para no salir de /repos/{owner}/{repo}.
const REPO_RE = /^(?!\.+\/)(?!.*\/\.+$)[\w.-]+\/[\w.-]+$/;
const DEFAULT_REPO = "Ally2403/My-Deutsch";
// RNF-20: el entorno de desarrollo dispara la copia del workflow de la rama `dev`.
const REF_RE = /^[\w][\w.\/-]{0,99}$/;

// Mensaje fijo: nunca incluye el token ni el cuerpo de la respuesta de GitHub.
export class DispatchError extends Error {
  constructor() {
    super("dispatch_failed");
  }
}

// ADR-006: dispara process-book.yml con workflow_dispatch (token con permiso Actions: escritura).
export async function dispatchProcessBook(
  bookId: string,
  opts: {
    token: string | undefined;
    repo?: string;
    ref?: string;
    fetchImpl?: typeof fetch;
  },
): Promise<void> {
  const repo = opts.repo || DEFAULT_REPO;
  if (!opts.token || !UUID_RE.test(bookId) || !REPO_RE.test(repo))
    throw new DispatchError();
  const ref =
    opts.ref && REF_RE.test(opts.ref) && !opts.ref.includes("..")
      ? opts.ref
      : "main";
  const doFetch = opts.fetchImpl ?? fetch;
  let status: number;
  try {
    const response = await doFetch(
      `https://api.github.com/repos/${repo}/actions/workflows/process-book.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "my-deutsch",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref,
          inputs: { book_id: bookId },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    status = response.status;
  } catch {
    throw new DispatchError();
  }
  if (status !== 204) {
    // Solo el estado HTTP, para diagnosticar permisos del token; nunca el token ni el cuerpo.
    console.error("dispatch: GitHub respondió con estado", status);
    throw new DispatchError();
  }
}
