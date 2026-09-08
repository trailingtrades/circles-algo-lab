/** UI chrome stays English. Teaching copy carries EN + Hinglish (Roman script only). */
export type Lang = "en" | "hi";

export const T = {
  welcome: { en: "Welcome back. Sign in to continue your course.", hi: "Wapas aane ke liye shukriya. Sign in karke apna course continue kijiye." },
  inviteHint: { en: "Need an invite link? Ask your mentor.", hi: "Invite link chahiye? Apne mentor se poochhiye." },
  todayTask: { en: "One task for today", hi: "Aaj ka ek kaam" },
  todayTaskBody: { en: "Finish Session 3 quiz and save one journal line. That is enough for today.", hi: "Session 3 ka quiz poora kijiye aur journal mein ek line likhiye. Aaj ke liye itna kaafi hai." },
  streakBody: { en: "Days in a row with at least one session action.", hi: "Lagataar din jab aapne kam se kam ek session action liya." },
  rankNote: { en: "This score is about your process, not your profit.", hi: "Ye score aapke process ka hai — profit ka nahi." },
  weekProgress: { en: "Week progress", hi: "Week ki progress" },
  nextDeadline: { en: "Next deadline", hi: "Agli deadline" },
  journalPrompt: { en: "Journal prompt", hi: "Journal prompt" },
  journalBody: { en: "What was the one Fact, one Guess and one Kachra in today's session?", hi: "Aaj ke session mein ek Fact, ek Guess aur ek Kachra kya tha?" },
  virtual: { en: "VIRTUAL — no real money", hi: "VIRTUAL — no real money" },
  lockedWhy: { en: "Unlocks after Session 3 quiz + journal are submitted.", hi: "Session 3 ka quiz aur journal submit hone ke baad khulega." },
  emptyTitle: { en: "Nothing here yet", hi: "Abhi yahan kuch nahi hai" },
  emptyBody: { en: "Your first session will appear once your cohort starts.", hi: "Aapka pehla session cohort shuru hote hi yahan dikhega." },
} as const;

export type TKey = keyof typeof T;
