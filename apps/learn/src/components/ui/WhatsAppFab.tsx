"use client";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3, tr } from "@/lib/i18n/lang";

/* Floating WhatsApp button on every app screen: one tap opens a chat with the Academy's enrolment
   line (the ONE number everywhere — same as AuthLinks and the landing's buttons) with a first line
   prefilled in the reader's language. It sits above the mobile BottomNav (see globals.css). */
const WA = "https://wa.me/916387497277";
const S = {
  label: t3("Chat with us on WhatsApp", "WhatsApp par baat kijiye", "WhatsApp पर बात कीजिए"),
  newTab: t3("(opens in a new tab)", "(naye tab mein khulega)", "(नए टैब में खुलेगा)"),
  // Single line: check_compliance.py allows Devanagari only on a line that carries the t3( call.
  text: t3("Hi, I have a question about the 5 Circles Academy.", "Namaste, mujhe 5 Circles Academy ke baare mein kuch poochhna hai.", "नमस्ते, मुझे 5 Circles Academy के बारे में कुछ पूछना है।"),
};

export function WhatsAppFab() {
  const { lang } = useLang();
  return (
    <a
      href={`${WA}?text=${encodeURIComponent(tr(S.text, lang))}`}
      className="lrn-wa-fab"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${tr(S.label, lang)} ${tr(S.newTab, lang)}`}
      title={tr(S.label, lang)}
    >
      {/* WhatsApp glyph (simple outline, matches the 24px Lucide-style icons) */}
      <svg viewBox="0 0 24 24" width={26} height={26} fill="currentColor" aria-hidden focusable="false">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.57 14.86L2 22l5.27-1.38A9.9 9.9 0 1 0 12.04 2Zm0 1.67a8.23 8.23 0 1 1-4.2 15.31l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1 7-12.6Zm-3.35 3.6c-.18 0-.47.07-.72.34-.25.27-.94.92-.94 2.24s.97 2.6 1.1 2.78c.14.18 1.9 2.9 4.6 4.06.64.28 1.14.44 1.53.57.64.2 1.23.17 1.69.1.52-.07 1.59-.65 1.81-1.27.23-.63.23-1.16.16-1.27-.07-.12-.25-.18-.52-.32-.27-.13-1.59-.78-1.83-.87-.25-.09-.43-.14-.61.13-.18.27-.7.88-.85 1.06-.16.18-.32.2-.58.07a7.33 7.33 0 0 1-2.16-1.33 8.1 8.1 0 0 1-1.49-1.86c-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.13-.6-1.45-.83-1.98-.21-.52-.44-.5-.61-.5h-.52Z" />
      </svg>
    </a>
  );
}
