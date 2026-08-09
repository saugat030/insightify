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
import PipeLineVisualization from "@/app/_components/pipeline-visualization";
import TranslateAndExportPreview from "@/app/_components/translate-and-export-preview";

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

export const FEATURES_DATA = {
  scan: {
    title: "AI & Extraction",
    desc: "Instant analysis of any URL. We strip the noise and find the signal.",
    color: "blue",
    preview: (
      <ScannerComponent variant="medium" className="h-full w-full" />
    )
  },
  flow: {
    title: "Workflow",
    desc: "A seamless pipeline from clipboard to permanent knowledge vault.",
    color: "purple",
    preview: (
      <PipeLineVisualization />
    )
  },
  notes: {
    title: "Translate & Export",
    desc: "Translate any Markdown notes instantly. Save them securely in your vault or extract them as a PDF for future reference.",
    color: "emerald",
    preview: (
      <TranslateAndExportPreview />
    )
  }
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