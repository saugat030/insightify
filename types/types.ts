import { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  allowedRoles: ("admin" | "user")[];
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  tagline: string;
  cta: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

export type Accent = "blue" | "emerald" | "purple";