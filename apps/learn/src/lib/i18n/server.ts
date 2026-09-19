import "server-only";
import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, type Lang } from "./lang";

/** The learner's language for server-rendered pages and server actions.
 *  Order: the header toggle's cookie (set on every switch) -> the profile's saved language -> English. */
export async function getLang(profileLang?: string | null): Promise<Lang> {
  try {
    const c = (await cookies()).get(LANG_COOKIE)?.value;
    if (isLang(c)) return c;
  } catch { /* outside a request (build time) */ }
  return isLang(profileLang) ? profileLang : "en";
}
