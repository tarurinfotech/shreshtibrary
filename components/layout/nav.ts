import {
  Armchair,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Gauge,
  Image,
  KeyRound,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Trophy,
  Mail
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  superOnly?: boolean;
  permissionKey?: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, tone: "text-sky-600 bg-sky-500/15 border-sky-500/25" },
  { href: "/dashboard/students", label: "Students", icon: Users, tone: "text-blue-600 bg-blue-500/15 border-blue-500/25", permissionKey: "manage_students" },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, tone: "text-emerald-600 bg-emerald-500/15 border-emerald-500/25", permissionKey: "manage_payments" },
  { href: "/dashboard/seats", label: "Seats", icon: Armchair, tone: "text-amber-600 bg-amber-500/15 border-amber-500/25", permissionKey: "manage_seats" },
  { href: "/dashboard/memberships", label: "Memberships", icon: ShieldCheck, tone: "text-violet-600 bg-violet-500/15 border-violet-500/25", permissionKey: "manage_plans" },
  { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck, tone: "text-cyan-600 bg-cyan-500/15 border-cyan-500/25", permissionKey: "manage_attendance" },
  { href: "/dashboard/reviews", label: "Reviews", icon: MessageSquare, tone: "text-rose-600 bg-rose-500/15 border-rose-500/25", permissionKey: "manage_reviews" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, tone: "text-orange-600 bg-orange-500/15 border-orange-500/25", permissionKey: "manage_notifications" },
  { href: "/dashboard/emails", label: "Email System", icon: Mail, tone: "text-indigo-500 bg-indigo-500/15 border-indigo-500/25", permissionKey: "manage_notifications" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, tone: "text-lime-700 bg-lime-500/15 border-lime-500/25" },
  { href: "/dashboard/library", label: "Library", icon: BookOpen, tone: "text-teal-600 bg-teal-500/15 border-teal-500/25", permissionKey: "manage_library" },
  { href: "/dashboard/sliders", label: "Sliders", icon: Image, tone: "text-indigo-600 bg-indigo-500/15 border-indigo-500/25", permissionKey: "manage_library" },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound, tone: "text-pink-600 bg-pink-500/15 border-pink-500/25" },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy, tone: "text-yellow-600 bg-yellow-500/15 border-yellow-500/25" },
  { href: "/dashboard/admins", label: "Admins", icon: KeyRound, tone: "text-fuchsia-600 bg-fuchsia-500/15 border-fuchsia-500/25", superOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, tone: "text-slate-600 bg-slate-500/15 border-slate-500/25", superOnly: true },
] as const;
