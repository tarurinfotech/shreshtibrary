/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Send, Eye, Copy } from "lucide-react";
import { useToastStore } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";

type EmailTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
  color: string;
  image: string;
  content: {
    title: string;
    subtitle: string;
    highlight?: string;
    reward?: string;
    stats?: { label: string; value: string }[];
    actionText?: string;
    footer: string;
  };
};

const emailTemplates: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Welcome to Shresht",
    description: "Send when a new student registers or is added by an admin.",
    subject: "Welcome to Shresht Library! 🎉",
    color: "from-blue-500 to-indigo-600",
    image: "/images/emails/welcome.png",
    content: {
      title: "Welcome {{first_name}} {{last_name}}!",
      subtitle: "We are thrilled to have you join Shresht Library. Your journey to excellence starts here.",
      highlight: "WELCOME",
      stats: [
        { label: "Registration Date", value: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
      ],
      actionText: "Explore Your Dashboard",
      footer: "Let's make studying great!",
    }
  },
  {
    id: "receipt",
    name: "Payment Receipt",
    description: "Sent when a student buys a plan or an admin assigns one.",
    subject: "Plan Activated & Payment Receipt 🎉",
    color: "from-indigo-500 to-purple-600",
    image: "/images/emails/receipt.png",
    content: {
      title: "Congratulations!",
      subtitle: "Your plan has been activated successfully. Your payment receipt is attached as a PDF.",
      stats: [
        { label: "Goal", value: "UPSC Civil Services" },
        { label: "Plan Details", value: "Premium Monthly" },
        { label: "Starts", value: "24 Oct 2026" },
        { label: "Expires", value: "24 Nov 2026" },
        { label: "Amount Paid", value: "₹1,500.00" },
        { label: "Payment Mode", value: "UPI" }
      ],
      actionText: "View Dashboard",
      footer: "Thank you for choosing Shresht Library!",
    }
  },
  {
    id: "otp",
    name: "OTP Verification",
    description: "One-time password for secure access.",
    subject: "Your OTP Code 🔐",
    color: "from-orange-400 to-red-500",
    image: "/images/emails/otp.png",
    content: {
      title: "Verify Your Login",
      subtitle: "Use the following OTP to complete your sign in. Valid for 10 mins.",
      highlight: "8 4 2 9 1 5",
      actionText: "Verify Now",
      footer: "If you didn't request this, please ignore this email.",
    }
  },
  {
    id: "forgot_password",
    name: "Forgot Password",
    description: "Password reset instructions.",
    subject: "Reset Your Password 🔑",
    color: "from-rose-400 to-pink-500",
    image: "/images/emails/forgot_password.png",
    content: {
      title: "Reset Password",
      subtitle: "We received a request to reset your password. Click the button below to choose a new one.",
      actionText: "Reset Password",
      footer: "If you didn't request a reset, you can safely ignore this email.",
    }
  },
  {
    id: "suspended",
    name: "Account Suspended",
    description: "Sent when a student's account is suspended.",
    subject: "Action Required: Account Suspended ⚠️",
    color: "from-red-500 to-rose-600",
    image: "/images/emails/suspended.png",
    content: {
      title: "Account Suspended",
      subtitle: "Your library account has been suspended.",
      stats: [
        { label: "Reason", value: "Policy violation or unpaid dues" },
        { label: "Date", value: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
      ],
      actionText: "Contact Admin",
      footer: "Please reach out to resolve this issue.",
    }
  },
  {
    id: "seat_allocated",
    name: "Seat Allocated",
    description: "Sent when a seat is assigned to a student.",
    subject: "Your Seat is Ready! 🪑",
    color: "from-amber-400 to-orange-500",
    image: "/images/emails/seat_allocated.png",
    content: {
      title: "Seat Allocated",
      subtitle: "A desk has been assigned to you. Here are your seating details:",
      highlight: "A - 12",
      stats: [
        { label: "Zone", value: "Quiet Study Area" },
        { label: "Timing", value: "08:00 AM - 08:00 PM" }
      ],
      footer: "Please ensure you follow the seating rules.",
    }
  },
  {
    id: "holiday",
    name: "Holiday Announcement",
    description: "Sent for library closures and public holidays.",
    subject: "Notice: Library Holiday 🌴",
    color: "from-sky-400 to-blue-500",
    image: "/images/emails/holiday.png",
    content: {
      title: "Holiday Notice",
      subtitle: "The library will remain closed on account of the upcoming public holiday.",
      stats: [
        { label: "Occasion", value: "Independence Day" },
        { label: "Date", value: "15 August 2026" }
      ],
      footer: "Plan your study schedule accordingly!",
    }
  },
  {
    id: "holiday_cancelled",
    name: "Holiday Cancelled",
    description: "Sent when a previously announced holiday is cancelled.",
    subject: "Update: Holiday Cancelled 📅",
    color: "from-sky-400 to-blue-500",
    image: "/images/emails/holiday.png",
    content: {
      title: "Holiday Cancelled",
      subtitle: "The previously announced holiday has been cancelled. The library will remain OPEN on this day.",
      stats: [
        { label: "Occasion", value: "Independence Day" },
        { label: "Date", value: "15 August 2026" }
      ],
      footer: "We look forward to seeing you at the library!",
    }
  }
];

export default function EmailSystemPage() {
  const [activeTemplate, setActiveTemplate] = useState(emailTemplates[0]);
  const addToast = useToastStore((state) => state.pushToast);
  const currentUser = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  // If not super admin, we can also return null to prevent flashing the UI
  if (currentUser && currentUser.role !== "super_admin") {
    return null;
  }

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key) || currentUser.permissions.includes("all");
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canCreate = hasPerm("NotificationManagement.Create");

  const handleSendTest = () => {
    addToast({
      kind: "success",
      title: "Test Email Sent",
      message: `A test email for "${activeTemplate.name}" has been sent to your inbox.`
    });
  };

  return (
    <>
      <PageHeader title="Email System" eyebrow="Communications" />
      
      <div className="grid lg:grid-cols-[350px_1fr] gap-8 h-[calc(100vh-12rem)]">
        {/* Sidebar */}
        <div className="flex flex-col gap-4 bg-panel rounded-2xl border border-border p-4 shadow-sm overflow-y-auto">
          <div className="mb-2 px-2">
            <h2 className="font-semibold text-lg">Templates</h2>
            <p className="text-xs text-muted mt-1">Select a template to preview or edit.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            {emailTemplates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setActiveTemplate(tpl)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeTemplate.id === tpl.id 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "border-border hover:border-primary/50 hover:bg-hover"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-panel-strong shadow-sm overflow-hidden border border-border`}>
                    <img src={tpl.image} alt={tpl.name} className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{tpl.name}</h3>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">{tpl.subject}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="bg-panel-strong rounded-2xl border border-border shadow-inner flex flex-col overflow-hidden relative">
          {/* Top toolbar */}
          <div className="h-14 bg-panel border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted" />
              <span className="text-sm font-medium text-foreground">Preview Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="secondary" icon={<Copy className="w-4 h-4" />}>
                Copy HTML
              </Button>
              <Button size="sm" variant="primary" icon={<Send className="w-4 h-4" />} onClick={handleSendTest} disabled={!canCreate}>
                Send Test
              </Button>
            </div>
          </div>

          {/* Email Canvas */}
          <div className="flex-1 overflow-hidden p-4 sm:p-8 flex justify-center items-center bg-background">
            
            {/* The Email Template Card */}
            <div className="w-full max-w-[400px] max-h-full bg-panel rounded-t-2xl rounded-b-xl shadow-xl overflow-y-auto flex flex-col relative border border-border hide-scrollbar">
              {/* Top Accent Line */}
              <div className={`h-1.5 w-full shrink-0 bg-gradient-to-r ${activeTemplate.color}`}></div>
              
              {/* Header Branding */}
              <div className="p-4 pb-1 flex items-center justify-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-contrast font-bold text-xs shadow-sm">
                    SL
                  </div>
                  <span className="font-bold text-base text-foreground tracking-tight">ShreshtLibrary</span>
                </div>
              </div>

              {/* Main Content */}
              <div className="px-6 py-4 flex flex-col items-center text-center flex-1">
                
                {/* Illustration / Icon Box */}
                <div className="mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full scale-[2.5] -z-10"></div>
                  <div className="w-24 h-24 flex items-center justify-center transition-transform hover:scale-105">
                    <img src={activeTemplate.image} alt={activeTemplate.name} className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm" />
                  </div>
                </div>

                <h1 className="text-xl font-bold text-foreground mb-1">{activeTemplate.content.title}</h1>
                <p className="text-muted text-[13px] leading-relaxed mb-5 max-w-[280px]">
                  {activeTemplate.content.subtitle}
                </p>

                {/* Optional Highlight/OTP */}
                {activeTemplate.content.highlight && (
                  <div className="mb-5 w-full">
                    <div className="bg-panel-strong border border-border rounded-xl p-3 flex justify-center">
                      <span className="text-2xl font-mono font-bold tracking-[0.4em] text-foreground ml-[0.2em]">
                        {activeTemplate.content.highlight}
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional Reward Box */}
                {activeTemplate.content.reward && (
                  <div className="w-full bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-600 shrink-0 text-sm">
                      🎉
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-semibold text-green-600 uppercase tracking-wider mb-0.5">Unlocked</div>
                      <div className="text-[13px] font-bold text-foreground">{activeTemplate.content.reward}</div>
                    </div>
                  </div>
                )}

                {/* Optional Stats/List */}
                {activeTemplate.content.stats && (
                  <div className="w-full space-y-1 mb-5">
                    {activeTemplate.content.stats.map((stat, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-panel-strong flex items-center justify-center text-muted text-xs">
                            {i === 0 ? "📅" : i === 1 ? "⏱️" : "⭐"}
                          </div>
                          <span className="text-[13px] text-muted font-medium">{stat.label}</span>
                        </div>
                        <span className="font-bold text-[13px] text-foreground">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA Button */}
                {activeTemplate.content.actionText && (
                  <button className={`mt-auto w-full py-3 px-6 rounded-xl text-white font-bold text-[13px] shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5 bg-gradient-to-r ${activeTemplate.color}`}>
                    {activeTemplate.content.actionText}
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="bg-panel-strong border-t border-border p-5 text-center shrink-0">
                <p className="text-muted text-[13px] font-medium mb-4">
                  {activeTemplate.content.footer}
                </p>
                
                <div className="flex items-center justify-center gap-3 mb-4">
                  {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                    <a key={social} href="#" className="w-7 h-7 rounded-full bg-panel border-border border shadow-sm flex items-center justify-center text-muted hover:text-primary transition-colors">
                      <div className="w-2.5 h-2.5 bg-current opacity-50 rounded-sm"></div>
                    </a>
                  ))}
                </div>
                
                <p className="text-[11px] text-muted leading-relaxed max-w-[280px] mx-auto">
                  If you would like to no longer receive updates, you may <a href="#" className="underline hover:text-foreground">unsubscribe</a>.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}

