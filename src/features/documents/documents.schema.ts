import { z } from "zod";

// These mirror the documents table (20261003140000_rag_schema.sql): mime_type and size_bytes checks, title length.
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TITLE_LENGTH = 200;

export const DOCUMENT_MIME_TYPES = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
} as const;
export type TDocumentMime = keyof typeof DOCUMENT_MIME_TYPES;
export const ACCEPTED_FILE_TYPES = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type TDocumentStatus = "uploaded" | "processing" | "ready" | "failed";

const zTitle = z.string().trim().min(1, "Enter a title").max(MAX_TITLE_LENGTH, `Title can be at most ${MAX_TITLE_LENGTH} characters`);

/** What the browser sends to ask for an upload slot. The file itself never goes through the server action. */
export const zUploadRequest = z.object({
  title: z.string().trim().max(MAX_TITLE_LENGTH, `Title can be at most ${MAX_TITLE_LENGTH} characters`).optional(),
  filename: z.string().trim().min(1).max(255),
  mime_type: z.enum(Object.keys(DOCUMENT_MIME_TYPES) as [TDocumentMime, ...TDocumentMime[]], {
    error: "Only PDF and Word (.docx) files are supported",
  }),
  size_bytes: z.number().int().positive("The file is empty").max(MAX_FILE_BYTES, "The file is larger than 10 MB"),
  content_hash: z.string().regex(/^[0-9a-f]{64}$/, "Invalid file hash"),
});
export type TUploadRequest = z.infer<typeof zUploadRequest>;

export const zDocumentId = z.object({ document_id: z.uuid("Invalid document") });
export const zRename = zDocumentId.extend({ title: zTitle });
export type TRename = z.infer<typeof zRename>;

/** The rename form only holds the title. */
export const zRenameForm = z.object({ title: zTitle });
export type TRenameForm = z.infer<typeof zRenameForm>;

/** The upload form: an optional title and the file. Checked in the browser before anything is sent. */
export const zUploadForm = z.object({
  title: z.string().trim().max(MAX_TITLE_LENGTH, `Title can be at most ${MAX_TITLE_LENGTH} characters`),
  file: z
    .custom<FileList>((v) => typeof FileList !== "undefined" && v instanceof FileList, "Choose a file")
    .refine((l) => l.length > 0, "Choose a file")
    .transform((l) => l[0] as File)
    .refine((f) => fileKind(f) !== null, "Only PDF and Word (.docx) files are supported")
    .refine((f) => f.size > 0, "The file is empty")
    .refine((f) => f.size <= MAX_FILE_BYTES, "The file is larger than 10 MB"),
});
export type TUploadFormInput = z.input<typeof zUploadForm>;
export type TUploadForm = z.output<typeof zUploadForm>;

/** Browsers sometimes leave `type` empty for .docx, so fall back to the extension. */
export function fileKind(file: { name: string; type: string }): TDocumentMime | null {
  if (file.type in DOCUMENT_MIME_TYPES) return file.type as TDocumentMime;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return null;
}

export const titleFromFilename = (filename: string) =>
  filename.replace(/\.(pdf|docx)$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH) || "Untitled";

/** Storage keys are restricted to a safe character set; the original name is kept in the table. */
export const safeFilename = (filename: string) =>
  filename.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "").slice(-100) || "file";

export const storagePathFor = (userId: string, documentId: string, filename: string) => `${userId}/${documentId}/${safeFilename(filename)}`;

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export type TActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string | undefined> };
