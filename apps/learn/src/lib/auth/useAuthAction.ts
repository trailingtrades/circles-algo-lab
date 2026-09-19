"use client";
import { useActionState } from "react";
import { unstable_rethrow } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { tr } from "@/lib/i18n/lang";
import { rejectedMessage } from "./messages";

/** useActionState for the sign-in, invite and reset forms. When nginx's rate limit answers the POST with 429,
 *  or the network drops, the action never runs and its promise rejects, and the page's error boundary used to
 *  take over with "An unexpected response was received from the server". Here the form shows the reason in
 *  the reader's language instead. Redirects (a successful sign-in) are rethrown so navigation still happens. */
export function useAuthAction<S extends { error?: string }>(action: (state: S, form: FormData) => Promise<S>, initial: S) {
  const { lang } = useLang();
  // State types here are plain objects, so Awaited<S> is S; TypeScript cannot see that for a generic S.
  return useActionState(async (state: Awaited<S>, form: FormData): Promise<S> => {
    try {
      return await action(state as S, form);
    } catch (e) {
      unstable_rethrow(e);
      return { error: tr(rejectedMessage(e), lang) } as S;
    }
  }, initial as Awaited<S>);
}
