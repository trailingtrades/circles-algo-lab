"use client";
import { CREDENTIAL_LINE, TIER1, TIER2, COMPANY, SEBI_REG_NO } from "@/lib/compliance/strings";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3, tr, type L, type Lang } from "@/lib/i18n/lang";

/* Labels only are translated. Names, the registration line, addresses and the Tier-1/Tier-2
   disclaimers are legal text and stay verbatim in English on every screen. */
const S = {
  about: t3("This academy teaches the market. It does not give tips, calls or investment advice.", "Ye academy market sikhati hai. Yahan tips, calls ya investment advice nahi milti.", "यह अकादमी मार्केट सिखाती है। यहाँ टिप्स, कॉल या निवेश सलाह नहीं मिलती।"),
  follow: t3("Follow", "Follow karein", "फ़ॉलो करें"),
  company: t3("Company", "Company", "कंपनी"),
  ra: t3("SEBI Registered Research Analyst (Non-Individual)", "SEBI Registered Research Analyst (Non-Individual)", "SEBI रजिस्टर्ड रिसर्च एनालिस्ट (नॉन-इंडिविजुअल)"),
  granted: t3("Registration granted 06 March 2025", "Registration mila: 06 March 2025", "रजिस्ट्रेशन मिला: 06 मार्च 2025"),
  po: t3("Principal Officer", "Principal Officer", "प्रिंसिपल ऑफ़िसर"),
  co: t3("Compliance Officer", "Compliance Officer", "कंप्लायंस ऑफ़िसर"),
  email: t3("Email", "Email", "ईमेल"),
  phone: t3("Phone", "Phone", "फ़ोन"),
  offices: t3("Offices", "Offices", "ऑफ़िस"),
  investor: t3("Investor protection", "Investor protection", "निवेशक सुरक्षा"),
  grievance: t3("Complaint? Write to our Compliance Officer first. If it is not resolved, you can take it to SEBI SCORES or SMART ODR.", "Koi shikayat hai? Pehle hamare Compliance Officer ko likhiye. Hal na ho to SEBI SCORES ya SMART ODR par le ja sakte hain.", "कोई शिकायत है? पहले हमारे कंप्लायंस ऑफ़िसर को लिखिए। हल न हो तो SEBI SCORES या SMART ODR पर ले जा सकते हैं।"),
  writeCo: t3("Write to the Compliance Officer", "Compliance Officer ko likhiye", "कंप्लायंस ऑफ़िसर को लिखिए"),
  charter: t3("Investor charter", "Investor charter", "इन्वेस्टर चार्टर"),
  redressal: t3("Grievance redressal", "Grievance redressal", "शिकायत निवारण"),
  policies: t3("Policies", "Policies", "नीतियाँ"),
  terms: t3("Terms of use", "Terms of use", "उपयोग की शर्तें"),
  privacy: t3("Privacy policy", "Privacy policy", "प्राइवेसी पॉलिसी"),
  refund: t3("Refund and cancellation", "Refund aur cancellation", "रिफ़ंड और कैंसलेशन"),
  disclaimer: t3("Disclaimer", "Disclaimer", "डिस्क्लेमर"),
  disclosure: t3("Disclosure", "Disclosure", "डिस्क्लोज़र"),
  sites: t3("Our sites", "Hamari sites", "हमारी साइटें"),
  companySite: t3("company site", "company site", "कंपनी की साइट"),
  newTab: t3("(opens in a new tab)", "(naye tab mein khulega)", "(नए टैब में खुलेगा)"),
  rights: t3("All rights reserved.", "All rights reserved.", "सर्वाधिकार सुरक्षित।"),
};

const LEGAL = "https://circleoptionlab.com/legal/";
const OFFICES = [
  { city: t3("Kanpur", "Kanpur", "कानपुर"), lines: ["First Floor, Premises No. 124/244 C Block, Plot No. 245", "Govind Nagar, Kanpur, Uttar Pradesh 208006"] },
  { city: t3("Mumbai", "Mumbai", "मुंबई"), lines: ["A Wing, G-022, Express Zone Mall, W E Highway", "Next to Patel Vanika, Malad East, Mumbai, Maharashtra 400063"] },
];
const PROTECT: [L | string, string][] = [
  [S.charter, LEGAL + "investor-charter/"],
  [S.redressal, LEGAL + "grievance/"],
  ["SEBI SCORES", "https://scores.sebi.gov.in/"],
  ["SMART ODR", "https://smartodr.in/login"],
];
const POLICIES: [L, string][] = [
  [S.terms, LEGAL + "terms/"], [S.privacy, LEGAL + "privacy/"], [S.refund, LEGAL + "refund/"],
  [S.disclaimer, LEGAL + "disclaimer/"], [S.disclosure, LEGAL + "disclosure/"],
];
const SOCIAL: [string, string][] = [
  ["YouTube", "https://www.youtube.com/@tradewithrahulsaraoge"],
  ["X", "https://x.com/Rahul_Saraoge"],
  ["Instagram", "https://www.instagram.com/rahul_saraoge"],
];

/** The site footer on every SMART screen: company and SEBI facts, investor-protection and policy
 *  links, the sister sites, then the verbatim disclaimer. This is the one place the credential line
 *  sits at the bottom of a page. Never collapsible, never clamped; the grievance route is always shown.
 *  `lang` pins the labels to one language (the English-only public verify page); without it they follow the header toggle. */
export function ComplianceFooter({ tier = 1, lang }: { tier?: 1 | 2; lang?: Lang }) {
  const ui = useLang();
  const tx = (x: L) => tr(x, lang ?? ui.lang);
  const ext = (label: string, href: string) => (
    <a href={href} target="_blank" rel="noopener">{label}<span className="sr-only"> {tx(S.newTab)}</span></a>
  );
  return (
    <footer className="lrn-footer" role="contentinfo">
      <div className="lrn-max">
        <div className="lrn-foot">
          <section className="lrn-foot__col lrn-foot__brand" aria-label="5 Circles Academy">
            <strong className="lrn-foot__name">5 Circles Academy</strong>
            <p className="lrn-footer__cred">{CREDENTIAL_LINE}</p>
            <p className="lrn-foot__note">{tx(S.about)}</p>
            <ul className="lrn-foot__links lrn-foot__links--row" aria-label={tx(S.follow)}>
              {SOCIAL.map(([l, h]) => <li key={h}>{ext(l, h)}</li>)}
            </ul>
          </section>

          <section className="lrn-foot__col" aria-labelledby="ft-company">
            <h2 className="lrn-foot__h" id="ft-company">{tx(S.company)}</h2>
            <address className="lrn-foot__addr">
              <span className="lrn-foot__strong">{COMPANY.legal}</span>
              <span>{tx(S.ra)}</span>
              <span>Reg. No. <span className="lrn-num">{SEBI_REG_NO}</span> · {tx(S.granted)}</span>
              <span>{tx(S.po)}: {COMPANY.principalOfficer}</span>
              <span>{tx(S.co)}: {COMPANY.complianceOfficer}</span>
              <span>{tx(S.email)}: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></span>
              <span>{tx(S.phone)}: <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="lrn-num">{COMPANY.phone}</a></span>
            </address>
          </section>

          <section className="lrn-foot__col" aria-labelledby="ft-offices">
            <h2 className="lrn-foot__h" id="ft-offices">{tx(S.offices)}</h2>
            {OFFICES.map((o) => (
              <address key={o.city.en} className="lrn-foot__addr">
                <span className="lrn-foot__strong">{tx(o.city)}</span>
                {o.lines.map((l) => <span key={l}>{l}</span>)}
              </address>
            ))}
          </section>

          <nav className="lrn-foot__col" aria-labelledby="ft-investor">
            <h2 className="lrn-foot__h" id="ft-investor">{tx(S.investor)}</h2>
            <span className="lrn-foot__note">{tx(S.grievance)}</span>
            <ul className="lrn-foot__links">
              <li><a href={`mailto:${COMPANY.email}?subject=Grievance`}>{tx(S.writeCo)}</a></li>
              {PROTECT.map(([l, h]) => <li key={h}>{ext(typeof l === "string" ? l : tx(l), h)}</li>)}
            </ul>
          </nav>

          <nav className="lrn-foot__col" aria-labelledby="ft-policies">
            <h2 className="lrn-foot__h" id="ft-policies">{tx(S.policies)}</h2>
            <ul className="lrn-foot__links">
              {POLICIES.map(([l, h]) => <li key={h}>{ext(tx(l), h)}</li>)}
            </ul>
          </nav>

          <nav className="lrn-foot__col" aria-labelledby="ft-sites">
            <h2 className="lrn-foot__h" id="ft-sites">{tx(S.sites)}</h2>
            <ul className="lrn-foot__links">
              <li>{ext(`5 Circles · ${tx(S.companySite)}`, "https://5circles.co")}</li>
              <li>{ext("CircleOptionLab", "https://circleoptionlab.com")}</li>
              {/* Same site, same tab: the Academy landing this app belongs to. */}
              <li><a href="https://learn.optionlab.co.in/">5 Circles Academy</a></li>
              <li>{ext("Mentor Academy", "https://mentor.optionlab.co.in")}</li>
            </ul>
          </nav>
        </div>

        <div className="lrn-foot__disc"><p>{tier === 1 ? TIER1 : TIER2}</p></div>
        <div className="lrn-foot__base">© 2026 {COMPANY.legal}. {tx(S.rights)}</div>
      </div>
    </footer>
  );
}
