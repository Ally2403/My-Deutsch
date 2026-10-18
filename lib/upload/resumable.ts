import { defaultOptions, Upload } from "tus-js-client";
import { isObjectAlreadyExists } from "./tus-errors";

/** RF-11: subida reanudable (TUS) a Supabase Storage. Sin React. */

export const CHUNK_SIZE = 6 * 1024 * 1024; // Supabase exige exactamente 6 MiB.
const UPLOAD_BUCKET = "uploads";

export type UploadHandle = { start(): void; abort(): Promise<void> };

export function startResumableUpload(args: {
  file: File;
  objectName: string;
  accessToken: string;
  supabaseUrl: string;
  onProgress(sent: number, total: number): void;
  onSuccess(): void;
  onError(err: Error): void;
}): UploadHandle {
  const upload = new Upload(args.file, {
    endpoint: `${args.supabaseUrl}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "x-upsert": "false",
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: UPLOAD_BUCKET,
      objectName: args.objectName,
      contentType: "application/pdf",
      cacheControl: "3600",
    },
    chunkSize: CHUNK_SIZE,
    // 409 = el objeto ya existe: reintentar solo haría esperar ~38 s en vano.
    // Se conserva la regla por omisión de tus (4xx no se reintenta salvo 423, exige conexión).
    onShouldRetry: (err, retryAttempt, options) =>
      !isObjectAlreadyExists(err) &&
      (defaultOptions.onShouldRetry?.(err, retryAttempt, options) ?? true),
    onProgress: (sent, total) => args.onProgress(sent, total ?? args.file.size),
    onSuccess: () => args.onSuccess(),
    onError: (err) => args.onError(err),
  });

  return {
    start() {
      void (async () => {
        try {
          const previous = await upload.findPreviousUploads();
          if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
        } catch {
          // Sin avance previo legible: se empieza de cero.
        }
        upload.start();
      })();
    },
    abort: () => upload.abort(),
  };
}
