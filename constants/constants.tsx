import { LayoutDashboard, Users, Link, User, Settings } from "lucide-react";
import { NavItem } from "@/types/types";
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

export const FEATURES_DATA = {
  extract: {
    title: "AI & Extraction",
    desc: "Paste any URL and we strip the noise to find the signal — title, summary and tags extracted automatically, then filed into your library as permanent, searchable knowledge.",
    href: "/features#ai-extraction",
    cta: "Explore AI & Extraction",
    preview: <ScannerComponent variant="medium" className="h-[500px] w-full" />,
  },
  editor: {
    title: "Translate & Export",
    desc: "A live Markdown editor with instant translation and one-click PDF export. Flip on the encrypted vault and your notes are sealed in your browser with a passphrase only you hold.",
    href: "/features#editor",
    cta: "Explore the editor & vault",
    preview: <TranslateAndExportPreview className="h-[500px] w-full" />,
  },
  analytics: {
    title: "Analytics Dashboard",
    desc: "See how your library grows over time — extraction activity, saved links and usage trends, broken down in one detailed dashboard.",
    href: "/features#analytics",
    cta: "Explore the dashboard",
    preview: <AnalyticsPreview className="h-[500px] w-full" />,
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

export const ACCENTS = {
  blue: { text: "text-blue-400", bullet: "text-blue-500" },
  emerald: { text: "text-emerald-400", bullet: "text-emerald-500" },
  purple: { text: "text-purple-400", bullet: "text-purple-500" },
} as const;
