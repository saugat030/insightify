import {
  LayoutDashboard,
  Users,
  Activity,
  Box,
  Globe,
  DollarSign,
  ShieldCheck,
  Link,
} from "lucide-react";
import { NavItem, StatData, Transaction, RevenueData } from "@/types/types";

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  { id: "links", label: "Links", icon: Link, path: "/links" },
  { id: "media", label: "Media", icon: Users, path: "/media" },
  { id: "products", label: "Products", icon: Box, path: "/products" },
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
