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
  href?: string;
  label?: string;
  icon?: LucideIcon;
  tone?: string;
  superOnly?: boolean;
  permissionKey?: string;
  divider?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge, tone: "text-sky-600 bg-sky-500/15 border-sky-500/25", permissionKey: "Dashboard.View" },
  { href: "/dashboard/students", label: "Students", icon: Users, tone: "text-blue-600 bg-blue-500/15 border-blue-500/25", permissionKey: "StudentManagement.View" },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, tone: "text-emerald-600 bg-emerald-500/15 border-emerald-500/25", permissionKey: "Payment.View" },
  { href: "/dashboard/seats", label: "Seats", icon: Armchair, tone: "text-amber-600 bg-amber-500/15 border-amber-500/25", permissionKey: "LibraryManagement.Seat" },
  { href: "/dashboard/memberships", label: "Memberships", icon: ShieldCheck, tone: "text-violet-600 bg-violet-500/15 border-violet-500/25", permissionKey: "Membership.View" },
  { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck, tone: "text-cyan-600 bg-cyan-500/15 border-cyan-500/25", permissionKey: "Attendance.View" },
  { href: "/dashboard/reviews", label: "Reviews", icon: MessageSquare, tone: "text-rose-600 bg-rose-500/15 border-rose-500/25", permissionKey: "LibraryManagement.Review" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, tone: "text-orange-600 bg-orange-500/15 border-orange-500/25", permissionKey: "NotificationManagement.View" },
  { href: "/dashboard/emails", label: "Email System", icon: Mail, tone: "text-indigo-500 bg-indigo-500/15 border-indigo-500/25", permissionKey: "NotificationManagement.View", superOnly: true },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, tone: "text-lime-700 bg-lime-500/15 border-lime-500/25", permissionKey: "Reports.View" },
  { href: "/dashboard/library", label: "Library", icon: BookOpen, tone: "text-teal-600 bg-teal-500/15 border-teal-500/25", permissionKey: "LibraryManagement.Settings" },
  { href: "/dashboard/sliders", label: "Sliders", icon: Image, tone: "text-indigo-600 bg-indigo-500/15 border-indigo-500/25", permissionKey: "LibraryManagement.Slider" },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound, tone: "text-pink-600 bg-pink-500/15 border-pink-500/25" },
  { divider: true },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy, tone: "text-yellow-600 bg-yellow-500/15 border-yellow-500/25", permissionKey: "StudentManagement.View" },
  { href: "/dashboard/admins", label: "Admins", icon: KeyRound, tone: "text-fuchsia-600 bg-fuchsia-500/15 border-fuchsia-500/25", permissionKey: "AdminManagement.View" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, tone: "text-slate-600 bg-slate-500/15 border-slate-500/25", permissionKey: "AppSettings.Manage" },
  { href: "/dashboard/platform-licensing", label: "Licensing", icon: ShieldCheck, tone: "text-emerald-600 bg-emerald-500/15 border-emerald-500/25", superOnly: true },
  { divider: true }
];
