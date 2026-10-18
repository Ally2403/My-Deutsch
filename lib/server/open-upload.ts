// Parte de la API de Storage que usamos; permite probar sin red.
export type UploadsBucket = {
  download(path: string): {
    asStream(): PromiseLike<{ data: ReadableStream<Uint8Array> | null; error: unknown }>;
  };
};

// Devuelve el flujo del PDF (sin cargarlo entero en memoria), null si el objeto no existe y
// lanza ante cualquier otro error: un fallo transitorio de Storage no debe rechazar la solicitud.
export async function openUpload(
  bucket: UploadsBucket,
  path: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const { data, error } = await bucket.download(path).asStream();
  if (error) {
    const status = (error as { status?: number }).status;
    if (status === 400 || status === 404) return null;
    throw new Error("storage_unavailable");
  }
  if (!data) throw new Error("storage_unavailable");
  return data;
}
