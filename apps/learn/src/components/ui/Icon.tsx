/**
 * CircleOptionLab / 5 Circles — line icon set
 * ------------------------------------------------------------
 * 50 line icons in the Lucide visual language (24x24, stroke-based,
 * round caps/joins, 2px default stroke) — bundled as plain SVG so this
 * file has ZERO npm dependency. Drop it into any React/TSX project,
 * no `npm install lucide-react` required.
 *
 * Rule: no emoji anywhere in 5 Circles product copy or UI. These icons
 * are the replacement — see SKILL.md "Icon rules".
 *
 * Source: lucide-static (ISC License) — https://lucide.dev
 * Glyphs unmodified from source; only wrapped in a shared <Icon> shell.
 *
 * Usage:
 *   import { TrendingUp, AlertTriangle } from "./Icon";
 *   <TrendingUp size={16} className="text-up" />
 *   <AlertTriangle size={20} strokeWidth={1.75} />
 */

import * as React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Pixel size, applied to both width and height. Default 24 (Lucide default). */
  size?: number | string;
  /** Stroke thickness. Default 2. Use 1.5 for dense/eyebrow-scale UI (10-12px text rows). */
  strokeWidth?: number | string;
}

/** Shared render shell every icon below is built on. Not exported on its own. */
function createIcon(displayName: string, children: React.ReactNode) {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, strokeWidth = 2, color = "currentColor", ...rest }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={rest["aria-label"] ? undefined : true}
        {...rest}
      >
        {children}
      </svg>
    )
  );
  Icon.displayName = displayName;
  return Icon;
}


export const TrendingUp = createIcon(
  "TrendingUp",
  <>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
  </>
);  // source: trending-up.svg

export const TrendingDown = createIcon(
  "TrendingDown",
  <>
      <path d="M16 17h6v-6" />
      <path d="m22 17-8.5-8.5-5 5L2 7" />
  </>
);  // source: trending-down.svg

export const Activity = createIcon(
  "Activity",
  <>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
  </>
);  // source: activity.svg

export const BarChart = createIcon(
  "BarChart",
  <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
  </>
);  // source: bar-chart-3.svg

export const LineChart = createIcon(
  "LineChart",
  <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="m19 9-5 5-4-4-3 3" />
  </>
);  // source: line-chart.svg

export const PieChart = createIcon(
  "PieChart",
  <>
      <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
  </>
);  // source: pie-chart.svg

export const CandlestickChart = createIcon(
  "CandlestickChart",
  <>
      <path d="M9 5v4" />
      <rect width="4" height="6" x="7" y="9" rx="1" />
      <path d="M9 15v2" />
      <path d="M17 3v2" />
      <rect width="4" height="8" x="15" y="5" rx="1" />
      <path d="M17 13v3" />
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
  </>
);  // source: candlestick-chart.svg

export const Target = createIcon(
  "Target",
  <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
  </>
);  // source: target.svg

export const Percent = createIcon(
  "Percent",
  <>
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
  </>
);  // source: percent.svg

export const IndianRupee = createIcon(
  "IndianRupee",
  <>
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 8.5 8" />
      <path d="M6 13h3" />
      <path d="M9 13c6.667 0 6.667-10 0-10" />
  </>
);  // source: indian-rupee.svg

export const Check = createIcon(
  "Check",
  <>
      <path d="M20 6 9 17l-5-5" />
  </>
);  // source: check.svg

export const CheckCircle = createIcon(
  "CheckCircle",
  <>
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
  </>
);  // source: circle-check-big.svg

export const XCircle = createIcon(
  "XCircle",
  <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
  </>
);  // source: circle-x.svg

export const AlertCircle = createIcon(
  "AlertCircle",
  <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
  </>
);  // source: circle-alert.svg

export const AlertTriangle = createIcon(
  "AlertTriangle",
  <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
  </>
);  // source: triangle-alert.svg

export const Info = createIcon(
  "Info",
  <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
  </>
);  // source: info.svg

export const HelpCircle = createIcon(
  "HelpCircle",
  <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
  </>
);  // source: circle-help.svg

export const ChevronDown = createIcon(
  "ChevronDown",
  <>
      <path d="m6 9 6 6 6-6" />
  </>
);  // source: chevron-down.svg

export const ChevronUp = createIcon(
  "ChevronUp",
  <>
      <path d="m18 15-6-6-6 6" />
  </>
);  // source: chevron-up.svg

export const ChevronLeft = createIcon(
  "ChevronLeft",
  <>
      <path d="m15 18-6-6 6-6" />
  </>
);  // source: chevron-left.svg

export const ChevronRight = createIcon(
  "ChevronRight",
  <>
      <path d="m9 18 6-6-6-6" />
  </>
);  // source: chevron-right.svg

export const ArrowUp = createIcon(
  "ArrowUp",
  <>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
  </>
);  // source: arrow-up.svg

export const ArrowDown = createIcon(
  "ArrowDown",
  <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
  </>
);  // source: arrow-down.svg

export const ArrowLeft = createIcon(
  "ArrowLeft",
  <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
  </>
);  // source: arrow-left.svg

export const ArrowRight = createIcon(
  "ArrowRight",
  <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
  </>
);  // source: arrow-right.svg

export const ArrowUpRight = createIcon(
  "ArrowUpRight",
  <>
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
  </>
);  // source: arrow-up-right.svg

export const X = createIcon(
  "X",
  <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
  </>
);  // source: x.svg

export const Plus = createIcon(
  "Plus",
  <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
  </>
);  // source: plus.svg

export const Minus = createIcon(
  "Minus",
  <>
      <path d="M5 12h14" />
  </>
);  // source: minus.svg

export const Menu = createIcon(
  "Menu",
  <>
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
  </>
);  // source: menu.svg

export const MoreHorizontal = createIcon(
  "MoreHorizontal",
  <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
  </>
);  // source: more-horizontal.svg

export const MoreVertical = createIcon(
  "MoreVertical",
  <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
  </>
);  // source: more-vertical.svg

export const Search = createIcon(
  "Search",
  <>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
  </>
);  // source: search.svg

export const Filter = createIcon(
  "Filter",
  <>
      <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
  </>
);  // source: filter.svg

export const Settings = createIcon(
  "Settings",
  <>
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <circle cx="12" cy="12" r="3" />
  </>
);  // source: settings.svg

export const RefreshCw = createIcon(
  "RefreshCw",
  <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
  </>
);  // source: refresh-cw.svg

export const ExternalLink = createIcon(
  "ExternalLink",
  <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </>
);  // source: external-link.svg

export const Copy = createIcon(
  "Copy",
  <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>
);  // source: copy.svg

export const Download = createIcon(
  "Download",
  <>
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
  </>
);  // source: download.svg

export const Share = createIcon(
  "Share",
  <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </>
);  // source: share-2.svg

export const Clock = createIcon(
  "Clock",
  <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
  </>
);  // source: clock.svg

export const Calendar = createIcon(
  "Calendar",
  <>
      <path d="M8 2v3" />
      <path d="M16 2v3" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
  </>
);  // source: calendar.svg

export const History = createIcon(
  "History",
  <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
  </>
);  // source: history.svg

export const User = createIcon(
  "User",
  <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
  </>
);  // source: user.svg

export const Lock = createIcon(
  "Lock",
  <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>
);  // source: lock.svg

export const Eye = createIcon(
  "Eye",
  <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
  </>
);  // source: eye.svg

export const EyeOff = createIcon(
  "EyeOff",
  <>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
  </>
);  // source: eye-off.svg

export const Bell = createIcon(
  "Bell",
  <>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </>
);  // source: bell.svg

export const Shield = createIcon(
  "Shield",
  <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </>
);  // source: shield.svg

export const ShieldCheck = createIcon(
  "ShieldCheck",
  <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
  </>
);  // source: shield-check.svg


/** Every icon in this file, for icon-picker UIs or tests. */
export const ICONS = {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart,
  LineChart,
  PieChart,
  CandlestickChart,
  Target,
  Percent,
  IndianRupee,
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  X,
  Plus,
  Minus,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Search,
  Filter,
  Settings,
  RefreshCw,
  ExternalLink,
  Copy,
  Download,
  Share,
  Clock,
  Calendar,
  History,
  User,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Shield,
  ShieldCheck,
} as const;
