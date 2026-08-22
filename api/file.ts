import { del, list } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

/**
 * Los PDFs en Vercel Blob, uno por documento: `files/<sha-256>.pdf`. El contenido de un id es
 * inmutable (el id ES el hash del PDF), así que aquí la caché del CDN no puede servir nada viejo.
 * La URL resultante es pública pero inadivinable: 256 bits de hash más el id aleatorio del store.
 */
/**
 * La cabecera es propia, no `Authorization`: Vercel se queda esa por el camino y la
 * función la recibe vacía, así que el código correcto también daba 401. Comprobado con un
 * endpoint de diagnóstico contra el despliegue real.
 */
const authorized = (request: Request): boolean =>
  !!process.env.SYNC_TOKEN && request.headers.get('x-sync-token') === process.env.SYNC_TOKEN;

const denied = (): Response => new Response('No autorizado', { status: 401 });

/** El id viene de fuera: solo un SHA-256 en hexadecimal puede tocar el almacén. */
const idOf = (request: Request): string | null => {
  const id = new URL(request.url).searchParams.get('id');
  return id && /^[0-9a-f]{64}$/.test(id) ? id : null;
};

/**
 * La subida no pasa por aquí (las funciones capan el cuerpo a ~4,5 MB y un PDF puede más):
 * este POST solo firma el token con el que el navegador sube directo a Blob.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!process.env.SYNC_TOKEN || clientPayload !== process.env.SYNC_TOKEN) throw new Error('No autorizado');
        if (!/^files\/[0-9a-f]{64}\.pdf$/.test(pathname)) throw new Error('Ruta no permitida');
        return { allowedContentTypes: ['application/pdf'], addRandomSuffix: false, allowOverwrite: true };
      },
      // Nada que apuntar al acabar: la ruta es determinista y la biblioteca viaja por /api/library.
      onUploadCompleted: async () => {},
    });
    return Response.json(response);
  } catch (cause) {
    return new Response(cause instanceof Error ? cause.message : 'Fallo de subida', { status: 400 });
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return denied();
  const id = idOf(request);
  if (!id) return new Response('Falta el id', { status: 400 });
  const { blobs } = await list({ prefix: `files/${id}` });
  const url = blobs[0]?.url;
  if (!url) return new Response('No está en la nube', { status: 404 });
  return Response.json({ url });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!authorized(request)) return denied();
  const id = idOf(request);
  if (!id) return new Response('Falta el id', { status: 400 });
  const { blobs } = await list({ prefix: `files/${id}` });
  if (blobs.length > 0) await del(blobs.map((blob) => blob.url));
  return new Response(null, { status: 204 });
}
