export const dynamic = "force-dynamic";
import { requireViewer } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { CertAdminForms } from "./Forms";

export default async function CertAdmin() {
  if (!supabaseConfigured()) return <p className="lrn-muted">The database is not connected.</p>;
  await requireViewer(["admin"]);
  const sb = await createClient();
  // `*` so the name frozen at issue (learner_name, migration 0010) shows once it exists; the live profile name is the fallback.
  const [{ data: certs }, { data: students }] = await Promise.all([
    sb.from("certificates").select("*,profiles(full_name),levels(title_en)").order("issued_on", { ascending: false }),
    sb.from("profiles").select("id,full_name").eq("role", "student").eq("status", "active").order("full_name"),
  ]);
  return (
    <>
      <p className="col-eyebrow">Admin · Certificates</p>
      <h1 className="lrn-title">Certificates</h1>
      <CertAdminForms certs={(certs ?? []).map((c) => ({ id: c.id, cert_no: c.cert_no, issued_on: c.issued_on, band: c.band, status: c.status, reason: c.revoked_reason, pdf: !!c.pdf_storage_path, name: (c.learner_name as string | null) || ((c.profiles as unknown as { full_name: string } | null)?.full_name ?? ""), level: (c.levels as unknown as { title_en: string } | null)?.title_en ?? "" }))} students={students ?? []} />
    </>
  );
}
