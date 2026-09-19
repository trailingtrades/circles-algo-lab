/** Shared UI strings in all three languages (en / hi = Hinglish, Roman script / dv = हिंदी).
 *  Page-specific copy lives next to its page as a local `const S = { ... } satisfies Record<string, L>`;
 *  put a string here only when two or more places use it. */
import type { L } from "./lang";

export type { Lang } from "./lang";

export const T = {
  rankNote: { en: "This score is about your process, not your profit.", hi: "Ye score aapke process ka hai, profit ka nahi.", dv: "यह स्कोर आपके प्रोसेस का है, मुनाफ़े का नहीं।" },
  virtual: { en: "VIRTUAL — no real money", hi: "VIRTUAL — asli paisa nahi", dv: "वर्चुअल — असली पैसा नहीं" },
  emptyTitle: { en: "Nothing here yet", hi: "Abhi yahan kuch nahi hai", dv: "अभी यहाँ कुछ नहीं है" },
  emptyBody: { en: "Your first session will appear once your cohort starts.", hi: "Aapka pehla session cohort shuru hote hi yahan dikhega.", dv: "आपका पहला सेशन बैच शुरू होते ही यहाँ दिखेगा।" },
  language: { en: "Language", hi: "Bhasha", dv: "भाषा" },
  switchLang: { en: "Change language", hi: "Bhasha badlein", dv: "भाषा बदलें" },
  themeLight: { en: "Switch to light theme", hi: "Light theme karein", dv: "लाइट थीम करें" },
  themeDark: { en: "Switch to dark theme", hi: "Dark theme karein", dv: "डार्क थीम करें" },
  skip: { en: "Skip to content", hi: "Seedha content par jaayein", dv: "सीधे कंटेंट पर जाएँ" },
  student: { en: "Student", hi: "Student", dv: "स्टूडेंट" },
  back: { en: "Back", hi: "Wapas", dv: "वापस" },
  save: { en: "Save", hi: "Save karein", dv: "सेव करें" },
  saving: { en: "Saving", hi: "Save ho raha hai", dv: "सेव हो रहा है" },
  saved: { en: "Saved", hi: "Save ho gaya", dv: "सेव हो गया" },
  signOut: { en: "Sign out", hi: "Sign out", dv: "साइन आउट" },
  tryAgain: { en: "Try again", hi: "Dobara koshish karein", dv: "फिर से कोशिश करें" },
  day: { en: "Day", hi: "Day", dv: "दिन" },
  week: { en: "Week", hi: "Week", dv: "हफ़्ता" },
  session: { en: "Session", hi: "Session", dv: "सेशन" },
  minutes: { en: "min", hi: "min", dv: "मिनट" },
  locked: { en: "Locked", hi: "Band hai", dv: "बंद है" },
  done: { en: "Done", hi: "Ho gaya", dv: "पूरा" },
  inProgress: { en: "In progress", hi: "Chal raha hai", dv: "चल रहा है" },
  open: { en: "Open", hi: "Kholein", dv: "खोलें" },
} satisfies Record<string, L>;

export type TKey = keyof typeof T;
