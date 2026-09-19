/* What a learner reads when sign-in, reset or invite goes wrong: one message per real cause
   (wrong password is not the same problem as a rate limit), in all three languages. */
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";

export const AUTH = {
  unconfigured: t3("Sign-in is not available right now. Please try again later.", "Sign-in abhi available nahi hai. Thodi der baad try kijiye.", "साइन-इन अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश कीजिए।"),
  missing: t3("Enter your email and password.", "Email aur password dono daaliye.", "ईमेल और पासवर्ड दोनों डालिए।"),
  emailMissing: t3("Enter your email address.", "Apna email daaliye.", "अपना ईमेल डालिए।"),
  wrong: t3("Email or password is incorrect. Check both, or reset your password.", "Email ya password galat hai. Dono check kijiye, ya password reset kar lijiye.", "ईमेल या पासवर्ड गलत है। दोनों जाँच लीजिए, या पासवर्ड रीसेट कर लीजिए।"),
  unconfirmed: t3("This email address is not confirmed yet. Open the invite link from 5 Circles, or ask your mentor for a new one.", "Ye email abhi confirm nahi hua hai. 5 Circles ka invite link kholiye, ya mentor se naya link maangiye.", "यह ईमेल अभी कन्फ़र्म नहीं हुआ है। 5 Circles का इनवाइट लिंक खोलिए, या मेंटर से नया लिंक माँगिए।"),
  rate: t3("Too many attempts. Please wait a few minutes, then try again.", "Bahut saari koshish ho gayi. Kuch minute rukiye, phir try kijiye.", "बहुत सारी कोशिशें हो गईं। कुछ मिनट रुकिए, फिर कोशिश कीजिए।"),
  network: t3("We could not reach the sign-in service. Check your internet connection and try again.", "Sign-in service se connection nahi ho paya. Internet check karke dobara try kijiye.", "साइन-इन सर्विस से कनेक्शन नहीं हो पाया। इंटरनेट जाँचकर फिर कोशिश कीजिए।"),
  suspended: t3("This account is suspended. Please contact your mentor or 5 Circles.", "Ye account suspend hai. Apne mentor ya 5 Circles se baat kijiye.", "यह अकाउंट सस्पेंड है। अपने मेंटर या 5 Circles से बात कीजिए।"),
  inactive: t3("This email does not have an active Academy account. You can sign in after you accept an invite from 5 Circles.", "Is email par koi active Academy account nahi hai. 5 Circles ka invite accept karne ke baad hi sign in hoga.", "इस ईमेल पर कोई एक्टिव Academy अकाउंट नहीं है। 5 Circles का इनवाइट स्वीकार करने के बाद ही साइन इन होगा।"),
  expired: t3("This link has expired or was already used. Please ask for a new one.", "Ye link expire ho gaya hai ya pehle hi use ho chuka hai. Naya link maangiye.", "यह लिंक एक्सपायर हो गया है या पहले ही इस्तेमाल हो चुका है। नया लिंक माँगिए।"),
  otherBrowser: t3("Open the link in the same browser where you requested it, or ask for a new link.", "Link usi browser mein kholiye jismein aapne request kiya tha, ya naya link maangiye.", "लिंक उसी ब्राउज़र में खोलिए जिसमें आपने रिक्वेस्ट किया था, या नया लिंक माँगिए।"),
  weak: t3("Choose a stronger password: at least 10 characters, mixing letters and numbers.", "Thoda mazboot password chuniye: kam se kam 10 characters, letters aur numbers mila kar.", "थोड़ा मज़बूत पासवर्ड चुनिए: कम से कम 10 कैरेक्टर, अक्षर और नंबर मिलाकर।"),
  same: t3("The new password must be different from the old one.", "Naya password purane se alag hona chahiye.", "नया पासवर्ड पुराने से अलग होना चाहिए।"),
  pwShort: t3("Password must be at least 10 characters.", "Password kam se kam 10 characters ka ho.", "पासवर्ड कम से कम 10 कैरेक्टर का हो।"),
  pwLong: t3("Password can be at most 72 characters.", "Password zyada se zyada 72 characters ka ho sakta hai.", "पासवर्ड ज़्यादा से ज़्यादा 72 कैरेक्टर का हो सकता है।"),
  pwMismatch: t3("The two passwords do not match.", "Dono password match nahi karte.", "दोनों पासवर्ड मेल नहीं खाते।"),
  generic: t3("Something went wrong on our side. Please try again in a minute.", "Hamari taraf kuch gadbad hui. Ek minute baad dobara try kijiye.", "हमारी तरफ़ कुछ गड़बड़ हुई। एक मिनट बाद फिर कोशिश कीजिए।"),
  unreached: t3("That did not reach us. Check your internet connection, wait a minute, then try again.", "Ye hum tak nahi pahuncha. Internet check kijiye, ek minute rukiye, phir dobara try kijiye.", "यह हम तक नहीं पहुँचा। इंटरनेट जाँचिए, एक मिनट रुकिए, फिर कोशिश कीजिए।"),
} satisfies Record<string, L>;

/** Why a sign-in, invite or reset POST was rejected before it reached the app. nginx's rate limit answers
 *  429 with the plain-text body "rate_limited" (smart-app.conf), which Next passes on as the error message;
 *  anything else (offline, app restarting) gets the neutral retry message. */
export const rejectedMessage = (e: unknown): L => (/rate_limited|\b429\b/.test(e instanceof Error ? e.message : "") ? AUTH.rate : AUTH.unreached);

type AuthErrLike = { code?: string; status?: number; name?: string; message?: string } | null | undefined;

const EXPIRED = new Set(["otp_expired", "session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "flow_state_expired", "flow_state_not_found", "bad_code_verifier"]);
const RATE = new Set(["over_request_rate_limit", "over_email_send_rate_limit", "over_sms_send_rate_limit"]);

/** Which message a Supabase auth error deserves. Never passes Supabase's raw text through. */
export function authKey(e: AuthErrLike): keyof typeof AUTH {
  if (!e) return "generic";
  const code = e.code ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(e.message ?? "")) return "wrong";
  if (code === "email_not_confirmed") return "unconfirmed";
  if (code === "user_banned") return "suspended";
  if (RATE.has(code) || e.status === 429) return "rate";
  if (code === "weak_password") return "weak";
  if (code === "same_password") return "same";
  if (code === "pkce_code_verifier_not_found") return "otherBrowser";
  if (EXPIRED.has(code) || e.name === "AuthSessionMissingError") return "expired";
  // AuthRetryableFetchError: fetch failed, timed out, or Supabase answered 502/503/504.
  if (e.name === "AuthRetryableFetchError" || e.status === 0 || code === "request_timeout") return "network";
  return "generic";
}
export const authMessage = (e: AuthErrLike, lang: Lang) => tr(AUTH[authKey(e)], lang);

/** Same rules on every "choose a password" form (invite, reset). 72 is the bcrypt input limit. */
export function passwordProblem(pw: string, again: string): L | null {
  if (pw.length < 10) return AUTH.pwShort;
  if (pw.length > 72) return AUTH.pwLong;
  if (pw !== again) return AUTH.pwMismatch;
  return null;
}
