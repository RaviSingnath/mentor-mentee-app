"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import handleFormSubmit from "@/lib/helper/handle-RHF-submit";
import { appToast } from "@/lib/helper/toast";
import {
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  renameDocumentAction,
} from "@/features/documents/documents.actions";
import { runIngestLoop } from "@/features/documents/documents.client";
import type { DocumentRow } from "@/features/documents/documents.queries";
import {
  DOCUMENT_MIME_TYPES,
  formatBytes,
  MAX_TITLE_LENGTH,
  zRenameForm,
  type TDocumentStatus,
  type TRenameForm,
} from "@/features/documents/documents.schema";

interface Props {
  doc: DocumentRow;
  /** The signed-in user. Only the uploader can rename or retry; the uploader and admins can download and delete. */
  currentUserId: string;
  isAdmin: boolean;
  /** Test seam: how to open a download link. */
  open?: (url: string) => void;
}

const STATUS_LABEL: Record<TDocumentStatus, string> = {
  uploaded: "Not processed",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};
const STATUS_CLASS: Record<TDocumentStatus, string> = {
  uploaded: "bg-muted text-muted-foreground",
  processing: "bg-muted text-muted-foreground",
  ready: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

function RenameForm({ doc, onDone }: { doc: DocumentRow; onDone: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TRenameForm>({
    resolver: zodResolver(zRenameForm),
    defaultValues: { title: doc.title },
  });

  async function onSubmit(values: TRenameForm) {
    await handleFormSubmit({
      action: () =>
        renameDocumentAction({ document_id: doc.id, title: values.title }),
      setError,
      successMessage: "Document renamed",
      onSuccess: () => {
        appToast.success("Document renamed");
        onDone();
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-wrap items-start gap-2"
    >
      <Field data-invalid={!!errors.title} className="w-auto min-w-64 flex-1">
        <Input
          aria-label="Title"
          maxLength={MAX_TITLE_LENGTH}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <FieldError>{errors.title.message}</FieldError>}
        {errors.root?.message && <FieldError>{errors.root.message}</FieldError>}
      </Field>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}

export function DocumentItem({ doc, currentUserId, isAdmin, open }: Props) {
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const isOwner = doc.uploaded_by === currentUserId;
  const canResume = isOwner && doc.status !== "ready";

  async function download() {
    setBusy("download");
    const r = await getDocumentDownloadUrlAction({ document_id: doc.id });
    setBusy(null);

    if (!r.success) return appToast.error(r.message);
    if (r?.data?.signedUrl)
      (open ?? ((url) => window.open(url, "_blank", "noopener")))(
        r.data.signedUrl,
      );
  }

  async function remove() {
    setBusy("delete");
    const r = await deleteDocumentAction({ document_id: doc.id });
    setBusy(null);
    setConfirmDelete(false);
    if (!r.success) return appToast.error(r.message);
    appToast.success("Document deleted");
  }

  async function resume() {
    setBusy("resume");
    const r = await runIngestLoop(doc.id, (p) =>
      setProgress(`${p.embedded} of ${p.total} sections`),
    );
    setBusy(null);
    setProgress(null);
    if (!r.ok) return appToast.error(r.error);
    appToast.success("Document is ready");
  }

  return (
    <li className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          {renaming ? (
            <RenameForm doc={doc} onDone={() => setRenaming(false)} />
          ) : (
            <h3 className="break-words font-medium">{doc.title}</h3>
          )}
          <p className="text-sm text-muted-foreground">
            {DOCUMENT_MIME_TYPES[doc.mime_type]} · {formatBytes(doc.size_bytes)}{" "}
            ·{" "}
            {new Date(doc.created_at).toLocaleDateString("en-IN", {
              dateStyle: "medium",
            })}
            {isAdmin && doc.uploader_name && (
              <> · Uploaded by {doc.uploader_name}</>
            )}
            {doc.status === "ready" && <> · {doc.chunk_count} sections</>}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[doc.status]}`}
        >
          {STATUS_LABEL[doc.status]}
        </span>
      </div>

      {doc.status === "failed" && doc.error_message && (
        <p className="text-sm text-destructive">{doc.error_message}</p>
      )}
      {progress && (
        <p role="status" className="text-sm text-muted-foreground">
          Indexing… {progress}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy !== null}
          onClick={download}
        >
          Download
        </Button>
        {canResume && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={resume}
          >
            {busy === "resume"
              ? "Working…"
              : doc.status === "failed"
                ? "Retry"
                : "Resume"}
          </Button>
        )}
        {isOwner && !renaming && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => setRenaming(true)}
          >
            Rename
          </Button>
        )}
        {confirmDelete ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy !== null}
              onClick={remove}
            >
              {busy === "delete" ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </li>
  );
}
