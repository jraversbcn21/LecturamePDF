/**
 * TEMPORAL: diagnóstico del 401 de la sincronización. No expone ningún valor, solo si las
 * variables existen, cuánto miden y si la cabecera Authorization llega hasta la función.
 * Se borra en cuanto sepamos por dónde falla.
 */
export async function GET(request: Request): Promise<Response> {
  const header = request.headers.get('x-sync-token');
  const token = process.env.SYNC_TOKEN;
  return Response.json({
    syncTokenDefinido: !!token,
    syncTokenLongitud: token?.length ?? 0,
    blobTokenDefinido: !!process.env.BLOB_READ_WRITE_TOKEN,
    cabeceraLlega: !!header,
    cabeceraLongitud: header?.length ?? 0,
    coincide: !!token && header === token,
  });
}
