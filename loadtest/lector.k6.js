// RNF-10 c1: 25 usuarios virtuales pasando página y consultando palabras durante 10 minutos.
// p95 < 500 ms y 0 respuestas 5xx. Uso (k6 en Docker; no lleva secretos al repositorio):
//   docker run --rm -i -e BASE_URL=https://my-deutsch.vercel.app -e BOOK_ID=<uuid> -e TOTAL=<páginas> \
//     -e COOKIE='sb-...-auth-token=...' [-e SUPABASE_URL=... -e SUPABASE_KEY=... -e ACCESS_TOKEN=... -e LEXICON_ID=1] \
//     grafana/k6 run - < loadtest/lector.k6.js
// - Sin COOKIE solo se prueba lo público (modo humo: SMOKE=1 usa 2 VUs durante 20 s sobre el lector de demostración).
// - La consulta de una palabra no hace red (RNF-01); lo que sí llega al servidor es `record_lookup` (RN-05),
//   que se ejecuta si se dan SUPABASE_URL, SUPABASE_KEY y ACCESS_TOKEN de una cuenta de prueba.
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://my-deutsch.vercel.app";
const SMOKE = __ENV.SMOKE === "1";
const TOTAL = parseInt(__ENV.TOTAL || "10", 10);
const page = new Trend("pagina_ms", true);

export const options = SMOKE
  ? { vus: 2, duration: "20s", thresholds: { http_req_failed: ["rate<0.01"] } }
  : {
      scenarios: {
        clase: { executor: "constant-vus", vus: 25, duration: __ENV.DURATION || "10m" },
      },
      thresholds: {
        // 95 % de las peticiones de API (datos e imagen de página, consulta) en menos de 500 ms
        http_req_duration: ["p(95)<500"],
        pagina_ms: ["p(95)<500"],
        // sin errores 5xx
        "http_req_failed{expected_response:false}": ["rate==0"],
        checks: ["rate>0.99"],
      },
    };

const headers = __ENV.COOKIE ? { Cookie: __ENV.COOKIE } : {};

function lookup() {
  if (!__ENV.SUPABASE_URL || !__ENV.ACCESS_TOKEN || !__ENV.BOOK_ID) return;
  const res = http.post(
    `${__ENV.SUPABASE_URL}/rest/v1/rpc/record_lookup`,
    JSON.stringify({
      p_lexicon_id: parseInt(__ENV.LEXICON_ID || "1", 10),
      p_book_id: __ENV.BOOK_ID,
      p_page: 1,
      p_sentence: "Prueba de carga.",
    }),
    {
      headers: {
        "content-type": "application/json",
        apikey: __ENV.SUPABASE_KEY,
        authorization: `Bearer ${__ENV.ACCESS_TOKEN}`,
      },
      tags: { name: "record_lookup" },
    },
  );
  check(res, { "record_lookup 2xx": (r) => r.status >= 200 && r.status < 300 });
}

export default function () {
  if (SMOKE || !__ENV.COOKIE) {
    const r = http.get(`${BASE}/demo/page-${1 + (__ITER % 3)}.json`);
    check(r, { "demo 200": (x) => x.status === 200 });
    page.add(r.timings.duration);
    sleep(1);
    return;
  }
  const n = 1 + Math.floor(Math.random() * TOTAL);
  const base = `${BASE}/api/libros/${__ENV.BOOK_ID}/paginas/${n}`;
  const data = http.get(`${base}/datos`, { headers, tags: { name: "pagina_datos" } });
  const img = http.get(`${base}/imagen`, { headers, tags: { name: "pagina_imagen" } });
  check(data, { "datos 200": (r) => r.status === 200 });
  check(img, { "imagen 200": (r) => r.status === 200 });
  page.add(data.timings.duration);
  page.add(img.timings.duration);
  // Una clase consulta varias palabras por página y lee un rato antes de pasar.
  for (let i = 0; i < 3; i++) lookup();
  sleep(15 + Math.random() * 15);
}
