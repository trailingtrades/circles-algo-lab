export const dynamic = "force-dynamic";
import { getViewer, createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { getLang } from "@/lib/i18n/server";
import { t3, tr } from "@/lib/i18n/lang";
import { T } from "@/lib/i18n/strings";
import { ProfileForms } from "@/components/admin/ProfileForms";
import { User } from "@/components/ui/Icon";

const S = {
  title: t3("Profile", "Profile", "प्रोफ़ाइल"),
  signedOut: t3("Sign in to see your profile", "Profile dekhne ke liye sign in kijiye", "प्रोफ़ाइल देखने के लिए साइन इन करें"),
  signedOutBody: t3("Your name, batch, language and password are managed here.", "Aapka naam, batch, bhasha aur password yahin manage hote hain.", "आपका नाम, बैच, भाषा और पासवर्ड यहीं मैनेज होते हैं।"),
  mentor: t3("Mentor", "Mentor", "मेंटर"),
  admin: t3("Admin", "Admin", "एडमिन"),
  noCohort: t3("no batch yet", "abhi koi batch nahi", "अभी कोई बैच नहीं"),
};

export default async function ProfilePage() {
  const v = supabaseConfigured() ? await getViewer() : null;
  const lang = await getLang(v?.lang);
  if (!v) {
    return (<><h1 className="lrn-title">{tr(S.title, lang)}</h1><div className="col-card col-empty"><User size={36} strokeWidth={1.5} aria-hidden /><p className="col-empty__title">{tr(S.signedOut, lang)}</p><p style={{ margin: 0 }}>{tr(S.signedOutBody, lang)}</p></div></>);
  }
  const sb = await createClient();
  const [{ data: p }, { count }] = await Promise.all([
    sb.from("profiles").select("full_name,phone,display_alias,lang,cohorts(name,level)").eq("id", v.id).single(),
    sb.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", v.id),
  ]);
  const cohort = p?.cohorts as unknown as { name: string; level: string } | null;
  const role = v.role === "admin" ? S.admin : v.role === "mentor" ? S.mentor : T.student;
  return (
    <>
      <p className="col-eyebrow">{tr(role, lang)} · {cohort?.name ?? tr(S.noCohort, lang)}</p>
      <h1 className="lrn-title">{tr(S.title, lang)}</h1>
      {/* The language shown is the one in use (header switch / cookie first), so saving never silently flips it back. */}
      <ProfileForms email={v.email ?? ""} fullName={p?.full_name ?? ""} phone={p?.phone ?? ""} alias={p?.display_alias ?? ""} lang={lang} hasCert={(count ?? 0) > 0} />
    </>
  );
}
