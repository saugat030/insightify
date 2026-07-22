export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  tier: "free" | "pro";
  linksCreatedCount: number;
  lastResetDate: string;
  profilePicture: string | null;
  googleId?: string | null;
  createdAt: string;
}
