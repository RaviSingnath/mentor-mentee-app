import type { PageText } from "./documents.chunking";
import type { TDocumentMime } from "./documents.schema";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ExtractionError extends Error {}

const startsWith = (bytes: Uint8Array, ...sig: number[]) => sig.every((b, i) => bytes[i] === b);

/** The declared type comes from the browser, so check the real bytes before handing them to a parser. */
export function assertFileMatchesType(bytes: Uint8Array, mime: TDocumentMime) {
  const ok =
    mime === "application/pdf"
      ? startsWith(bytes, 0x25, 0x50, 0x44, 0x46, 0x2d) // %PDF-
      : startsWith(bytes, 0x50, 0x4b, 0x03, 0x04); // zip container (docx)
  if (!ok) throw new ExtractionError("The file content does not match its type");
}

/** Text per page for PDFs, one block for Word. Scanned (image-only) PDFs have no text layer and yield nothing. */
export async function extractPages(bytes: Uint8Array, mime: TDocumentMime): Promise<PageText[]> {
  assertFileMatchesType(bytes, mime);
  try {
    if (mime === DOCX) {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return [{ page: null, text: value }];
    }
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes)); // copy: pdf.js may transfer the buffer
    const { text } = await extractText(pdf, { mergePages: false });
    return (text as string[]).map((t, i) => ({ page: i + 1, text: t }));
  } catch (e) {
    throw new ExtractionError(`Could not read the file: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}
