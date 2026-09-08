import { Activity, BarChart, Calendar, Download, Shield, User, IndianRupee, Target, type IconProps } from "@/components/ui/Icon";
export interface NavItem { href: string; label: string; icon: React.ComponentType<IconProps>; }
export const NAV: readonly NavItem[] = [
  { href: "/learn/home", label: "Home", icon: Activity },
  { href: "/learn/path", label: "Path", icon: Calendar },
  { href: "/learn/portfolio", label: "Portfolio", icon: IndianRupee },
  { href: "/learn/leaderboard", label: "Board", icon: BarChart },
  { href: "/learn/certificate", label: "Certificate", icon: Shield },
  { href: "/learn/resources", label: "Resources", icon: Download },
  { href: "/learn/profile", label: "Profile", icon: User },
];
export const BOTTOM: readonly NavItem[] = [NAV[0], NAV[1], NAV[2], NAV[3], { href: "/learn/profile", label: "More", icon: Target }];
