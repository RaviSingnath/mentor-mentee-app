import { redirect } from "next/navigation";
import { DocumentsList } from "./_components/documents-list";
import { UploadForm } from "./_components/upload-form";
import { listDocuments } from "@/features/documents/documents.queries";
import { isCurrentUserAdmin } from "@/lib/auth/is-admin";
import { getCurrentUserServer } from "@/lib/auth/getCurrentUserServer";

export const dynamic = "force-dynamic";
// Each ingestion step downloads, parses and embeds one slice of a document; give it room on Vercel.
export const maxDuration = 60;

export default async function DocumentsPage() {
  const user = await getCurrentUserServer();

  if (!user) redirect("/");

  const isAdmin = await isCurrentUserAdmin();
  const docs = await listDocuments(isAdmin);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload PDF or Word files. Everything you upload becomes searchable in
          chat for every member.{" "}
          {isAdmin
            ? "As an admin you can see, download and delete all documents."
            : "Only you can see this list."}
        </p>
      </header>
      <UploadForm />
      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          {isAdmin ? "All documents" : "Your documents"}
        </h2>
        <DocumentsList docs={docs} currentUserId={user.id} isAdmin={isAdmin} />
      </section>
    </main>
  );
}
