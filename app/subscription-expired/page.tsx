"use client";

import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Lock, LogOut, CheckCircle2, QrCode, Upload, ArrowRight, ShieldCheck, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { endpoints } from "@/lib/endpoints";
import { useQuery, useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { toast } from "react-hot-toast";
import { getErrorMessage } from "@/lib/api";

import { QRCodeSVG } from "qrcode.react";

export default function SubscriptionExpiredPage() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const userRole = useAuthStore((state) => state.user?.role);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubSuperAdmin, setIsSubSuperAdmin] = useState(false);
  const [step, setStep] = useState<"locked" | "plans" | "payment">("locked");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: currentSub } = useQuery({
    queryKey: ["currentSubscription"],
    queryFn: endpoints.currentSubscription,
  });

  const { data: plans } = useQuery({
    queryKey: ["platformPlans"],
    queryFn: endpoints.platformPlans,
    enabled: step === "plans",
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ["publicPaymentSettings"],
    queryFn: endpoints.publicPaymentSettings,
    enabled: step === "payment",
  });

  useEffect(() => {
    if (userRole) {
      setIsSubSuperAdmin(userRole === "sub_super_admin");
      setIsLoading(false);
    }
  }, [userRole]);

  const submitPayment = useMutation({
    mutationFn: async () => {
      // In a real app we'd upload the screenshot to cloudinary first and get the URL
      // Since this is a demo/MVP we'll just pass a dummy URL or we should integrate cloudinary here
      // For now, let's assume screenshotPath is optional or handled later
      return endpoints.submitLibraryPayment({
        PlanId: selectedPlan.id,
        DurationDays: 30, // Default to monthly for now
        Amount: selectedPlan.monthlyPrice,
        UtrNumber: utrNumber,
        ScreenshotPath: "pending_upload.jpg", 
      });
    },
    onSuccess: () => {
      toast.success("Payment submitted successfully! Waiting for Super Admin approval.");
      setStep("locked");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    }
  });

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-neutral-950" />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />

      {step === "locked" && (
        <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-neutral-800 p-8 text-center space-y-8 relative z-10">
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center rotate-12 shadow-inner border border-red-500/20">
            <Lock className="w-10 h-10 text-red-500 -rotate-12" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Access Locked</h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {currentSub?.status === "Pending" ? "Your renewal payment is pending approval by the Super Admin. Please wait." : "Your library's subscription has expired. Platform access is temporarily suspended until the subscription is renewed."}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            {isSubSuperAdmin && currentSub?.status !== "Pending" && (
              <Button 
                onClick={() => setStep("plans")}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold py-6 rounded-xl transition-all shadow-lg shadow-red-900/20 border border-red-500/50"
              >
                Renew Subscription Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full border-neutral-800 hover:bg-neutral-800/50 text-neutral-300 py-6 rounded-xl bg-neutral-900/50 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out Securely
            </Button>
          </div>
          
          {!isSubSuperAdmin && (
            <div className="mt-6 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 flex items-start gap-3 text-left">
              <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-400">
                Please contact your library administrator to renew the subscription and restore access.
              </p>
            </div>
          )}
        </div>
      )}

      {step === "plans" && (
        <div className="max-w-5xl w-full relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Choose Your Renewal Plan</h2>
            <p className="text-neutral-400">Select a plan to continue providing uninterrupted services to your students.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {plans?.map((plan: any) => (
              <div 
                key={plan.id}
                className={clsx(
                  "relative p-8 rounded-3xl border transition-all duration-300 flex flex-col cursor-pointer overflow-hidden",
                  plan.isRecommended 
                    ? "bg-gradient-to-b from-indigo-900/40 to-neutral-900/80 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 scale-105 z-10" 
                    : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60"
                )}
                onClick={() => {
                  setSelectedPlan(plan);
                  setStep("payment");
                }}
              >
                {plan.isRecommended && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}
                
                <h3 className="text-xl font-bold text-white">{plan.planName}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">₹{plan.monthlyPrice}</span>
                  <span className="text-neutral-500 font-medium">/mo</span>
                </div>
                
                <div className="mt-8 space-y-4 flex-1">
                  {plan.features?.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span className="text-sm text-neutral-300">{f}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm text-neutral-300">Up to {plan.maxStudents} Students</span>
                  </div>
                </div>

                <Button 
                  className={clsx(
                    "w-full mt-8 rounded-xl py-6 font-semibold",
                    plan.isRecommended 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20" 
                      : "bg-white text-black hover:bg-neutral-200"
                  )}
                >
                  Select Plan
                </Button>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Button variant="ghost" onClick={() => setStep("locked")} className="text-neutral-400 hover:text-white">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "payment" && (
        <div className="max-w-4xl w-full bg-neutral-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row">
          {/* Left: Plan Summary */}
          <div className="md:w-1/3 bg-neutral-950 p-8 border-r border-neutral-800">
            <h3 className="text-lg font-medium text-neutral-400 mb-6">Order Summary</h3>
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
              <div className="flex justify-between items-center text-white font-bold">
                <span>{selectedPlan?.planName}</span>
                <span>₹{selectedPlan?.monthlyPrice}</span>
              </div>
              <p className="text-sm text-indigo-300/70">1 Month Subscription</p>
            </div>
            
            <div className="mt-8 pt-8 border-t border-neutral-800 flex justify-between items-center text-xl font-bold text-white">
              <span>Total</span>
              <span>₹{selectedPlan?.monthlyPrice}</span>
            </div>
          </div>

          {/* Right: Payment Details */}
          <div className="md:w-2/3 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Make Payment</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep("plans")} className="text-neutral-400">Back</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* QR Code Section */}
              <div className="space-y-4">
                <div className="aspect-square bg-white p-4 rounded-2xl flex items-center justify-center max-w-[200px] mx-auto">
                  {paymentSettings?.qrCodePath ? (
                    <img src={paymentSettings.qrCodePath.startsWith('http') ? paymentSettings.qrCodePath : `/media/${paymentSettings.qrCodePath}`} alt="UPI QR" className="w-full h-full object-contain" />
                  ) : paymentSettings?.upiId ? (
                    <QRCodeSVG 
                      value={`upi://pay?pa=${paymentSettings.upiId}&pn=${encodeURIComponent(paymentSettings.merchantName || 'Library')}&cu=INR`}
                      size={160}
                      level={"M"}
                      includeMargin={false}
                    />
                  ) : (
                    <QrCode className="w-20 h-20 text-neutral-200" />
                  )}
                </div>
                <div className="text-center space-y-1">
                  <p className="font-mono text-sm text-neutral-300 bg-neutral-800 py-2 px-4 rounded-lg inline-block border border-neutral-700">{paymentSettings?.upiId || "N/A"}</p>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">{paymentSettings?.merchantName || "Merchant"}</p>
                </div>
              </div>

              {/* Form Section */}
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-neutral-400 block mb-2">UTR / Reference Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input 
                      type="text" 
                      value={utrNumber}
                      onChange={e => setUtrNumber(e.target.value)}
                      placeholder="e.g. 123456789012"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-400 block mb-2">Payment Screenshot</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-neutral-700 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-950 transition-colors group"
                  >
                    <Upload className="w-6 h-6 text-neutral-500 group-hover:text-indigo-400 mb-2" />
                    <span className="text-sm text-neutral-400 group-hover:text-indigo-300">
                      {screenshot ? screenshot.name : "Click to upload screenshot"}
                    </span>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => submitPayment.mutate()}
                  disabled={!utrNumber || !screenshot || submitPayment.isPending}
                  className="w-full bg-white text-black hover:bg-neutral-200 py-6 rounded-xl font-bold mt-4"
                >
                  {submitPayment.isPending ? "Submitting..." : "Submit for Verification"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
