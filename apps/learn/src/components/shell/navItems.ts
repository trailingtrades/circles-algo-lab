import type { ComponentType } from "react";
import { Home, MapIcon, Briefcase, Target, BarChart, Award, Download, User, BookOpen, Settings, type IconProps } from "@/components/ui/Icon";
import { t3, type L } from "@/lib/i18n/lang";

/* Named navItems.ts (not nav.ts): next to Nav.tsx the two names differ only by case, which breaks
   imports on Windows/macOS file systems. Labels are trilingual; render them with tr()/tx(). */
export type Role = "student" | "mentor" | "admin";
export interface NavItem { href: string; label: L; icon: ComponentType<IconProps>; }

export const NAV: readonly NavItem[] = [
  { href: "/learn/home", label: t3("Home", "Home", "होम"), icon: Home },
  { href: "/learn/path", label: t3("Path", "Path", "रास्ता"), icon: MapIcon },
  { href: "/learn/portfolio", label: t3("Portfolio", "Portfolio", "पोर्टफ़ोलियो"), icon: Briefcase },
  { href: "/learn/score", label: t3("Score", "Score", "स्कोर"), icon: Target },
  { href: "/learn/leaderboard", label: t3("Board", "Board", "बोर्ड"), icon: BarChart },
  { href: "/learn/certificate", label: t3("Certificate", "Certificate", "सर्टिफ़िकेट"), icon: Award },
  { href: "/learn/resources", label: t3("Resources", "Resources", "रिसोर्स"), icon: Download },
  { href: "/learn/profile", label: t3("Profile", "Profile", "प्रोफ़ाइल"), icon: User },
];

/** Phone bottom bar: four daily destinations; everything else sits in the More sheet. */
export const BOTTOM: readonly NavItem[] = [NAV[0], NAV[1], NAV[3], NAV[4]];
export const MORE: readonly NavItem[] = [NAV[2], NAV[5], NAV[6], NAV[7]];

const MENTOR: NavItem = { href: "/learn/mentor", label: t3("Mentor", "Mentor", "मेंटर"), icon: BookOpen };
const ADMIN: NavItem = { href: "/learn/admin", label: t3("Admin", "Admin", "एडमिन"), icon: Settings };
/** Staff-only entries. Students never see them; the pages re-check the role server-side anyway. */
export const staffNav = (role?: Role): NavItem[] => (role === "admin" ? [MENTOR, ADMIN] : role === "mentor" ? [MENTOR] : []);

/** Active when on the item's page or anywhere below it. */
export const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");
