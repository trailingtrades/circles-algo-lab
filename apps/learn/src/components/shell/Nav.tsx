"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, BOTTOM, type NavItem } from "./nav";

function Items({ items, dense }: { items: readonly NavItem[]; dense?: boolean }) {
  const path = usePathname();
  return <>{items.map(({ href, label, icon: I }) => (
    <Link key={href + label} href={href} className="lrn-nav-item" aria-current={path.startsWith(href) ? "page" : undefined}>
      <I size={dense ? 20 : 18} strokeWidth={1.75} aria-hidden /><span>{label}</span>
    </Link>
  ))}</>;
}
export function Sidebar() { return <nav className="lrn-sidebar" aria-label="Primary"><Items items={NAV} /></nav>; }
export function BottomNav() { return <nav className="lrn-bottomnav" aria-label="Primary"><Items items={BOTTOM} dense /></nav>; }
