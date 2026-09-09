export const dynamic = "force-dynamic";
import { getViewer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { ProfileForms } from "@/components/admin/ProfileForms";
import { User } from "@/components/ui/Icon";

export default async function ProfilePage() {
  const v = supabaseConfigured() ? await getViewer() : null;
  if (!v) {
    return (<><h1 className="lrn-title">Profile</h1><div className="col-card col-empty"><User size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">Sign in to see your profile</p><p style={{ margin: 0 }}>Naam, cohort, language aur password yahan manage honge.</p></div></>);
  }
  const sb = await createClient();
  const { data: p } = await sb.from("profiles").select("full_name,phone,display_alias,lang,cohorts(name,level)").eq("id", v.id).single();
  const cohort = p?.cohorts as unknown as { name: string; level: string } | null;
  return (
    <>
      <p className="col-eyebrow">{v.role} · {cohort?.name ?? "no cohort"}</p>
      <h1 className="lrn-title">Profile</h1>
      <ProfileForms email={v.email ?? ""} fullName={p?.full_name ?? ""} phone={p?.phone ?? ""} alias={p?.display_alias ?? ""} lang={p?.lang ?? "en"} />
    </>
  );
}
