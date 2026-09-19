import { redirect } from "next/navigation";

/* The 5 Circles Academy landing is the static site at the domain root (learn.optionlab.co.in/), not
   part of this app. This root used to hold a second copy of the stage ladder that had drifted from the
   real one (old access-code wording, wrong module counts), so it now goes where production already
   goes (next.config redirects / to /learn under the basePath): the CIRCLE S.M.A.R.T sign-in. */
export default function AppRoot() {
  redirect("/learn");
}
