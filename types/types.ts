import { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface StatData {
  id: string;
  label: string;
  value: string;
  change: number;
  trend: "up" | "down" | "neutral";
  icon: LucideIcon;
  color: string;
}

export interface Transaction {
  id: string;
  user: string;
  amount: string;
  status: "Completed" | "Pending" | "Failed";
  date: string;
  avatar: string;
}

export interface RevenueData {
  name: string;
  revenue: number;
  visitors: number;
}
