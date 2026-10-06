import type { DocumentRow } from "@/features/documents/documents.queries";
import { DocumentItem } from "@/components/documents/document-item";

export function DocumentsList({ docs, currentUserId, isAdmin }: { docs: DocumentRow[]; currentUserId: string; isAdmin: boolean }) {
  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">{isAdmin ? "No documents have been uploaded yet." : "You have not uploaded any documents yet."}</p>;
  }
  return (
    <ul className="space-y-3" aria-label={isAdmin ? "All documents" : "Your documents"}>
      {docs.map((d) => (
        <DocumentItem key={d.id} doc={d} currentUserId={currentUserId} isAdmin={isAdmin} />
      ))}
    </ul>
  );
}
