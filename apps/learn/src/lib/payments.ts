/* Razorpay Payment Page URLs, one per purchasable stage. A Payment Page collects the student's
   name, phone and email itself and takes the payment on Razorpay's hosted page — after a payment,
   the admin grants the stage at /learn/mentor/stages (auto-grant via webhook is a later step).
   Leave a stage empty ("") while its page does not exist yet: every CTA then falls back to the
   WhatsApp enrolment line. URLs look like https://rzp.io/l/<slug> or https://pages.razorpay.com/<slug>. */
export const PAY_URLS = {
  funda: "",
  winners: "",
  winners_plus: "",
  one: "",
  pro_plus: "",
} as const;

export type PayableStage = keyof typeof PAY_URLS;

export function payUrl(stage: string): string | null {
  const u = (PAY_URLS as Record<string, string>)[stage] ?? "";
  return /^https:\/\/(rzp\.io|pages\.razorpay\.com)\//.test(u) ? u : null;
}
