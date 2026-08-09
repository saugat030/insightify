import {
  LayoutDashboard,
  Users,
  Activity,
  Globe,
  DollarSign,
  ShieldCheck,
  Link,
  User,
  Settings,
} from "lucide-react";
import { NavItem, StatData, Transaction, RevenueData } from "@/types/types";
import ScannerComponent from "@/app/_components/scanner-component";
import TranslateAndExportPreview from "@/app/_components/translate-and-export-preview";
import AnalyticsPreview from "@/app/_components/analytics-preview";

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
    allowedRoles: ["admin"],
  },
  {
    id: "user-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    allowedRoles: ["user"],
  },
  {
    id: "links",
    label: "Links",
    icon: Link,
    path: "/links",
    allowedRoles: ["user"],
  },
  {
    id: "users",
    label: "Users",
    icon: User,
    path: "/admin/users",
    allowedRoles: ["admin"],
  },
  {
    id: "media",
    label: "Media",
    icon: Users,
    path: "/media",
    allowedRoles: ["user"],
  },
  {
    id: "editor",
    label: "Editor",
    icon: Users,
    path: "/editor",
    allowedRoles: ["user"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/settings",
    allowedRoles: ["admin", "user"],
  },
];

export const STATS: StatData[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "$124,592.00",
    change: 12.5,
    trend: "up",
    icon: DollarSign,
    color: "text-emerald-400",
  },
  {
    id: "visitors",
    label: "Active Visitors",
    value: "45.2k",
    change: -2.4,
    trend: "down",
    icon: Globe,
    color: "text-blue-400",
  },
  {
    id: "activity",
    label: "Server Load",
    value: "24%",
    change: 0.8,
    trend: "neutral",
    icon: Activity,
    color: "text-purple-400",
  },
  {
    id: "security",
    label: "Security Score",
    value: "98/100",
    change: 5.2,
    trend: "up",
    icon: ShieldCheck,
    color: "text-cyan-400",
  },
];

export const REVENUE_DATA: RevenueData[] = [
  { name: "Jan", revenue: 4000, visitors: 2400 },
  { name: "Feb", revenue: 3000, visitors: 1398 },
  { name: "Mar", revenue: 2000, visitors: 9800 },
  { name: "Apr", revenue: 2780, visitors: 3908 },
  { name: "May", revenue: 1890, visitors: 4800 },
  { name: "Jun", revenue: 2390, visitors: 3800 },
  { name: "Jul", revenue: 3490, visitors: 4300 },
];

export const TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    user: "Alex Morgan",
    amount: "$450.00",
    status: "Completed",
    date: "2 min ago",
    avatar: "https://picsum.photos/32/32?random=1",
  },
  {
    id: "2",
    user: "Sarah Connor",
    amount: "$120.50",
    status: "Pending",
    date: "15 min ago",
    avatar: "https://picsum.photos/32/32?random=2",
  },
  {
    id: "3",
    user: "John Doe",
    amount: "$950.00",
    status: "Failed",
    date: "1 hour ago",
    avatar: "https://picsum.photos/32/32?random=3",
  },
  {
    id: "4",
    user: "Emily Blunt",
    amount: "$35.00",
    status: "Completed",
    date: "3 hours ago",
    avatar: "https://picsum.photos/32/32?random=4",
  },
];

// The homepage feature showcase. One entry per major product capability:
//   1. AI extraction (the links/scanner flow)
//   2. The Markdown editor + encrypted vault
//   3. The analytics dashboard
//
// `chrome` controls whether FeaturePrism wraps the preview in the mac window
// frame — the scanner ships its own browser chrome, so it opts out.
export const FEATURES_DATA = {
  extract: {
    title: "AI & Extraction",
    desc: "Paste any URL and we strip the noise to find the signal — title, summary and tags extracted automatically, then filed into your library as permanent, searchable knowledge.",
    href: "/features#ai-extraction",
    cta: "Explore AI & Extraction",
    chrome: false,
    preview: <ScannerComponent variant="medium" className="h-full w-full" />,
  },
  editor: {
    title: "Translate & Export",
    desc: "A live Markdown editor with instant translation and one-click PDF export. Flip on the encrypted vault and your notes are sealed in your browser with a passphrase only you hold.",
    href: "/features#editor",
    cta: "Explore the editor & vault",
    chrome: true,
    preview: <TranslateAndExportPreview />,
  },
  analytics: {
    title: "Analytics Dashboard",
    desc: "See how your library grows over time — extraction activity, saved links and usage trends, broken down in one detailed dashboard.",
    href: "/features#analytics",
    cta: "Explore the dashboard",
    chrome: true,
    preview: <AnalyticsPreview />,
  },
};

export const DEFAULT_MARKDOWN = `# Welcome to the Live Editor
Start typing on the left, and see the formatting on the right!

## Features
* **No hacky code:** Clean client-side PDF generation.
* **Live rendering:** Updates as you type.
* **Instant Download:** Direct to your machine.

| Column 1 | Column 2 |
| -------- | -------- |
| Table    | Support  |
`;