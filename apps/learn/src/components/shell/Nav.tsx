"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/LangProvider";
import { t3 } from "@/lib/i18n/lang";
import { MoreHorizontal, X } from "@/components/ui/Icon";
import { BOTTOM, MORE, isActive, staffNav, type Role } from "./navItems";

const S = {
  menu: t3("Main menu", "Main menu", "मुख्य मेन्यू"),
  more: t3("More", "Aur", "और"),
  close: t3("Close", "Band karein", "बंद करें"),
};

/* Phone navigation (the desktop pill nav lives in Header). Four daily destinations plus More, which
   opens a bottom sheet with the rest — Portfolio, Certificate, Resources, Profile and, for staff,
   Mentor/Admin. A native <dialog> gives focus trapping, Esc-to-close and the backdrop for free. */
export function BottomNav({ role }: { role?: Role }) {
  const path = usePathname();
  const { tx } = useLang();
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const more = [...MORE, ...staffNav(role)];
  const moreOn = more.some((i) => isActive(path, i.href));
  const close = () => sheet.current?.close();
  return (
    <>
      <nav className="lrn-bottomnav" aria-label={tx(S.menu)}>
        {BOTTOM.map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className="lrn-nav-item" aria-current={isActive(path, href) ? "page" : undefined}>
            <I size={20} strokeWidth={1.75} aria-hidden /><span>{tx(label)}</span>
          </Link>
        ))}
        <button type="button" className="lrn-nav-item" data-on={moreOn || undefined} aria-haspopup="dialog" aria-expanded={open} aria-controls="lrn-more"
          onClick={() => { sheet.current?.showModal(); setOpen(true); }}>
          <MoreHorizontal size={20} strokeWidth={1.75} aria-hidden /><span>{tx(S.more)}</span>
        </button>
      </nav>
      {/* Click on the backdrop lands on the <dialog> itself (the inner div covers the box). */}
      <dialog id="lrn-more" ref={sheet} className="lrn-sheet" aria-labelledby="lrn-more-h" onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div className="lrn-sheet__in">
          <div className="lrn-sheet__head">
            <h2 id="lrn-more-h">{tx(S.more)}</h2>
            <button type="button" className="lrn-iconbtn" onClick={close} aria-label={tx(S.close)}><X size={18} strokeWidth={1.75} aria-hidden /></button>
          </div>
          <ul className="lrn-sheet__list">
            {more.map(({ href, label, icon: I }) => (
              <li key={href}>
                <Link href={href} className="lrn-sheet__item" onClick={close} aria-current={isActive(path, href) ? "page" : undefined}>
                  <I size={20} strokeWidth={1.75} aria-hidden /><span>{tx(label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
