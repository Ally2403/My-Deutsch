/* RF-50 · ADR-008: service worker propio de My-Deutsch.
 * - Estáticos (/_next/static, /icons, /demo): caché primero.
 * - Navegaciones: red primero; sin red, la copia (solo lector/demo) o /offline.
 * - Imágenes y JSON de páginas: caché por usuaria, acotado; se purga al cerrar sesión.
 * - Todo lo demás (Supabase, POST, /auth/*, /api/cuenta/*): solo red, nunca caché.
 */
const SW_VERSION = "1";
const STATIC_CACHE = "md-static-v" + SW_VERSION;
const DATA_PREFIX = "md-data-";
const META_CACHE = "md-meta";
const META_KEY = "/__sw-user";
const OFFLINE_URL = "/offline.html";
const MAX_DATA_ENTRIES = 300;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PAGES_RE = new RegExp(
  "^/api/libros/" + UUID + "/paginas/[1-9][0-9]{0,2}/(imagen|datos)$",
);
const NAV_CACHEABLE_RE = new RegExp("^(/lector/demo|/libros/" + UUID + ")/?$");

function dataCacheName(version, userId) {
  return DATA_PREFIX + version + "-" + userId;
}
function isDataCache(name) {
  return name.indexOf(DATA_PREFIX) === 0;
}
function isCacheableNavigation(pathname) {
  return NAV_CACHEABLE_RE.test(pathname);
}
function isPrivateNavigation(pathname) {
  return pathname.indexOf("/libros/") === 0;
}

function routeFor(url, method, opts) {
  const o = opts || {};
  let u;
  try {
    u = new URL(url);
  } catch {
    return "network-only";
  }
  if (o.origin && u.origin !== o.origin) return "network-only";
  if (method !== "GET") return "network-only";
  const p = u.pathname;
  if (p.indexOf("/auth/") === 0 || p.indexOf("/api/cuenta/") === 0)
    return "network-only";
  if (o.rsc) return "network-only";
  if (o.mode === "navigate") return "navigate";
  if (
    p.indexOf("/_next/static/") === 0 ||
    p.indexOf("/icons/") === 0 ||
    p.indexOf("/demo/") === 0
  )
    return "static";
  if (PAGES_RE.test(p)) return "pages";
  return "network-only";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    routeFor,
    isCacheableNavigation,
    dataCacheName,
    isDataCache,
    SW_VERSION,
  };
}

if (
  typeof self !== "undefined" &&
  typeof self.addEventListener === "function"
) {
  let currentUser; // undefined = sin leer todavía; null = sin sesión

  async function readUser() {
    if (currentUser !== undefined) return currentUser;
    try {
      const meta = await caches.open(META_CACHE);
      const hit = await meta.match(META_KEY);
      currentUser = hit ? await hit.text() : null;
    } catch {
      currentUser = null;
    }
    return currentUser || null;
  }

  async function purgeData() {
    const names = await caches.keys();
    await Promise.all(names.filter(isDataCache).map((n) => caches.delete(n)));
  }

  async function setUser(id) {
    const next = id || null;
    const prev = await readUser();
    if (prev !== next) await purgeData(); // cambio de usuaria: nada de la anterior se conserva
    currentUser = next;
    const meta = await caches.open(META_CACHE);
    if (next) await meta.put(META_KEY, new Response(next));
    else await meta.delete(META_KEY);
  }

  async function trim(cache) {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_DATA_ENTRIES; i++)
      await cache.delete(keys[i]);
  }

  async function userCache() {
    const user = await readUser();
    if (!user) return null; // sin usuaria conocida no se guarda ni se sirve nada
    return caches.open(dataCacheName(SW_VERSION, user));
  }

  async function staticFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res.ok && res.type === "basic") await cache.put(request, res.clone());
    return res;
  }

  async function pagesFirst(request, isData) {
    const cache = await userCache();
    if (!cache) return fetch(request);
    // El JSON puede reprocesarse: red primero con copia de respaldo. Las imágenes no cambian.
    if (!isData) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }
    try {
      const res = await fetch(request);
      if (res.ok) {
        await cache.put(request, res.clone());
        await trim(cache);
      } else if (
        res.status === 401 ||
        res.status === 403 ||
        res.status === 404
      ) {
        await cache.delete(request);
      }
      return res;
    } catch (e) {
      const hit = await cache.match(request);
      if (hit) return hit;
      throw e;
    }
  }

  async function navNamespace(pathname) {
    return isPrivateNavigation(pathname)
      ? userCache()
      : caches.open(STATIC_CACHE);
  }

  async function navigate(request) {
    const pathname = new URL(request.url).pathname;
    try {
      const res = await fetch(request);
      if (res.ok && !res.redirected && isCacheableNavigation(pathname)) {
        const cache = await navNamespace(pathname);
        if (cache) await cache.put(request, res.clone());
      }
      return res;
    } catch {
      if (isCacheableNavigation(pathname)) {
        const cache = await navNamespace(pathname);
        const hit = cache && (await cache.match(request));
        if (hit) return hit;
      }
      const offline = await (
        await caches.open(STATIC_CACHE)
      ).match(OFFLINE_URL);
      return offline || new Response("Sin conexión", { status: 503 });
    }
  }

  // Sin skipWaiting automático: la versión nueva espera a que la usuaria pulse «Actualizar».
  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const res = await fetch(new Request(OFFLINE_URL, { cache: "reload" }));
        if (!res.ok) throw new Error("offline page unavailable");
        // Un Response «redirected» no se puede usar para responder una navegación: se recrea.
        const clean = new Response(await res.blob(), {
          status: res.status,
          headers: { "Content-Type": res.headers.get("Content-Type") || "text/html" },
        });
        await (await caches.open(STATIC_CACHE)).put(OFFLINE_URL, clean);
      })(),
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter(
              (n) =>
                (n.indexOf("md-static-") === 0 && n !== STATIC_CACHE) ||
                (isDataCache(n) &&
                  n.indexOf(DATA_PREFIX + SW_VERSION + "-") !== 0),
            )
            .map((n) => caches.delete(n)),
        );
        await self.clients.claim();
      })(),
    );
  });

  self.addEventListener("message", (event) => {
    const d = event.data || {};
    if (d.type === "skip-waiting") self.skipWaiting();
    else if (d.type === "purge") {
      event.waitUntil(purgeData().then(() => setUser(null)));
    } else if (d.type === "user") {
      event.waitUntil(setUser(typeof d.id === "string" ? d.id : null));
    }
  });

  self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);
    // Cerrar sesión: el propio SW purga, sin depender de que la página alcance a avisar.
    if (
      req.method === "POST" &&
      url.origin === self.location.origin &&
      url.pathname === "/auth/signout"
    ) {
      event.waitUntil(purgeData().then(() => setUser(null)));
      return;
    }
    const kind = routeFor(req.url, req.method, {
      mode: req.mode,
      origin: self.location.origin,
      rsc: req.headers.has("rsc") || url.searchParams.has("_rsc"),
    });
    if (kind === "network-only") return;
    if (kind === "static") event.respondWith(staticFirst(req));
    else if (kind === "navigate") event.respondWith(navigate(req));
    else if (kind === "pages")
      event.respondWith(pagesFirst(req, url.pathname.endsWith("/datos")));
  });
}
