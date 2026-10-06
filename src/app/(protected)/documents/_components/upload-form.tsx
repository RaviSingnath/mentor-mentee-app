"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import handleFormSubmit from "@/lib/helper/handle-RHF-submit";
import { appToast } from "@/lib/helper/toast";
import { createUploadAction } from "@/features/documents/documents.actions";
import {
  putToSignedUrl,
  runIngestLoop,
  sha256Hex,
} from "@/features/documents/documents.client";
import {
  ACCEPTED_FILE_TYPES,
  fileKind,
  MAX_TITLE_LENGTH,
  zUploadForm,
  type TActionResult,
  type TUploadForm,
  type TUploadFormInput,
} from "@/features/documents/documents.schema";
import { ActionResponse } from "@/lib/types/action-response";
import { ERROR_CODES } from "@/lib/errors/error-codes";

/** Adds a full stop when a message does not end with one, so it can be followed by another sentence. */
const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

type Phase = { label: string; embedded?: number; total?: number } | null;

export function UploadForm() {
  const [phase, setPhase] = useState<Phase>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TUploadFormInput, unknown, TUploadForm>({
    resolver: zodResolver(zUploadForm),
    defaultValues: { title: "" },
  });

  /** Register -> send the file to Storage -> embed it in steps. Returns the same result shape as the other actions. */
  async function upload({ title, file }: TUploadForm): Promise<ActionResponse> {
    setPhase({ label: "Checking the file…" });
    const content_hash = await sha256Hex(file);

    const created = await createUploadAction({
      title: title || undefined,
      filename: file.name,
      mime_type: fileKind(file),
      size_bytes: file.size,
      content_hash,
    });
    if (!created.success) return created;

    const { data } = created;

    setPhase({ label: "Uploading…" });
    if (!data?.signed_url) {
      return {
        success: false,
        code: ERROR_CODES.DATABASE_ERROR,
        message: `The document is listed below; you can delete it or retry.`,
      };
    }

    const sent = await putToSignedUrl(data?.signed_url, file);
    if (!sent.ok)
      return {
        success: false,
        code: ERROR_CODES.DATABASE_ERROR,
        message: `${sentence(sent.error)} The document is listed below; you can delete it or retry.`,
      };

    setPhase({ label: "Reading and indexing…", embedded: 0, total: 0 });
    if (!data?.document_id) {
      return {
        success: false,
        code: ERROR_CODES.DATABASE_ERROR,
        message: `The document is listed below; you can delete it or retry.`,
      };
    }
    const done = await runIngestLoop(data.document_id, (p) =>
      setPhase({ label: "Reading and indexing…", ...p }),
    );
    return done.ok
      ? { success: true }
      : {
          success: false,
          code: ERROR_CODES.DATABASE_ERROR,
          message: `${sentence(done.error)} You can retry from the list below.`,
        };
  }

  async function onSubmit(values: TUploadForm) {
    try {
      await handleFormSubmit({
        action: () => upload(values),
        setError,
        successMessage: "Document added",
        onSuccess: () => {
          reset();
          if (fileInput.current) fileInput.current.value = ""; // form reset clears it in browsers; this makes it certain
          appToast.success("Document added. It is now searchable in chat.");
        },
      });
    } finally {
      setPhase(null);
    }
  }

  const fileField = register("file");
  const percent = phase?.total
    ? Math.round(((phase.embedded ?? 0) / phase.total) * 100)
    : null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground"
    >
      <h2 className="text-base font-semibold">Upload a document</h2>
      <FieldGroup>
        <Field data-invalid={!!errors.file}>
          <FieldLabel htmlFor="file">File</FieldLabel>
          <Input
            id="file"
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            aria-invalid={!!errors.file}
            disabled={isSubmitting}
            {...fileField}
            ref={(el) => {
              fileField.ref(el);
              fileInput.current = el;
            }}
          />
          <FieldDescription>
            PDF or Word (.docx), up to 10 MB. Scanned images are not supported.
          </FieldDescription>
          {errors.file && <FieldError>{errors.file.message}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Title (optional)</FieldLabel>
          <Input
            id="title"
            type="text"
            maxLength={MAX_TITLE_LENGTH}
            placeholder="Defaults to the file name"
            aria-invalid={!!errors.title}
            disabled={isSubmitting}
            {...register("title")}
          />
          {errors.title && <FieldError>{errors.title.message}</FieldError>}
        </Field>

        {errors.root?.message && <FieldError>{errors.root.message}</FieldError>}

        {phase && (
          <div
            role="status"
            aria-live="polite"
            className="space-y-1 text-sm text-muted-foreground"
          >
            <p>
              {phase.label}
              {percent !== null && ` ${percent}%`}
            </p>
            {percent !== null && (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2 w-full overflow-hidden rounded bg-muted"
              >
                <div
                  className="h-2 rounded bg-primary transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>
        )}

        <Field orientation="horizontal">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working…" : "Upload"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
