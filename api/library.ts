import { del, list, put } from '@vercel/blob';
// La extensión es obligatoria: Vercel transpila esta función a ESM sin reescribir el
// especificador, y Node se niega a resolver un import sin extensión (ERR_MODULE_NOT_FOUND en
// producción, invisible para `tsc` y para el e2e, que responde esta API con page.route).
import { mergeEntries, type Mergeable } from '../src/core/merge.js';

/**
 * La biblioteca compartida, un JSON en Vercel Blob. Cada escritura crea un fichero nuevo
 * (sufijo aleatorio) y borra los anteriores: sobrescribir el mismo nombre serviría copias
 * viejas desde la caché del CDN, y la fusión del PUT leería datos caducados.
 */
const PREFIX = 'library';

/**
 * La cabecera es propia, no `Authorization`: Vercel se queda esa por el camino y la
 * función la recibe vacía, así que el código correcto también daba 401. Comprobado con un
 * endpoint de diagnóstico contra el despliegue real.
 */
const authorized = (request: Request): boolean =>
  !!process.env.SYNC_TOKEN && request.headers.get('x-sync-token') === process.env.SYNC_TOKEN;

const denied = (): Response => new Response('No autorizado', { status: 401 });

async function readRemote(): Promise<{ entries: Mergeable[]; urls: string[] }> {
  const { blobs } = await list({ prefix: PREFIX });
  const sorted = [...blobs].sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
  const newest = sorted[0];
  if (!newest) return { entries: [], urls: [] };
  const entries = (await (await fetch(newest.url)).json()) as Mergeable[];
  return { entries, urls: sorted.map((blob) => blob.url) };
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return denied();
  const { entries } = await readRemote();
  return Response.json(entries);
}

// ponytail: leer-fusionar-escribir sin lock; con un solo usuario, que dos dispositivos
// empujen en el mismo instante es asumible. Si algún día pisa cambios, un lock optimista
// (reintentar si la lista cambió entre la lectura y la escritura).
export async function PUT(request: Request): Promise<Response> {
  if (!authorized(request)) return denied();
  const client = (await request.json()) as Mergeable[];
  const { entries, urls } = await readRemote();
  const merged = mergeEntries(entries, client);
  await put(`${PREFIX}.json`, JSON.stringify(merged), {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/json',
  });
  if (urls.length > 0) await del(urls);
  return Response.json(merged);
}
