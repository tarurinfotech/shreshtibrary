"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/endpoints";
import { useToastStore } from "@/store/toastStore";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShieldCheck, Plus, CheckCircle2, Trash2, Eye, EyeOff, Edit3, XCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/api";

export default function PlatformLicensingPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [activeTab, setActiveTab] = useState("payments");

  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Queries
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["platformPlans"],
    queryFn: endpoints.platformPlans
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["libraryPayments"],
    queryFn: endpoints.libraryPayments
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["platformPaymentSettings"],
    queryFn: endpoints.platformPaymentSettings
  });

  // Mutations
  const approvePayment = useMutation({
    mutationFn: (id: number) => endpoints.approveLibraryPayment(id),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Payment Approved", message: "Payment approved & subscription activated!" });
      queryClient.invalidateQueries({ queryKey: ["libraryPayments"] });
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const rejectPayment = useMutation({
    mutationFn: (id: number) => endpoints.rejectLibraryPayment(id),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Payment Rejected", message: "Payment has been rejected." });
      queryClient.invalidateQueries({ queryKey: ["libraryPayments"] });
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const createPlan = useMutation({
    mutationFn: (payload: any) => endpoints.createPlatformPlan(payload),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Plan Created", message: "Successfully created new subscription plan." });
      queryClient.invalidateQueries({ queryKey: ["platformPlans"] });
      setIsCreatePlanOpen(false);
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const updateSettings = useMutation({
    mutationFn: (payload: any) => endpoints.updatePlatformPaymentSettings(payload),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Settings Saved", message: "Payment settings updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["platformPaymentSettings"] });
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => endpoints.updatePlatformPlan(id, payload),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Plan Updated", message: "Plan updated successfully." });
      setIsCreatePlanOpen(false);
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["platformPlans"] });
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const deletePlan = useMutation({
    mutationFn: (id: number) => endpoints.deletePlatformPlan(id),
    onSuccess: () => {
      pushToast({ kind: "success", title: "Plan Deleted", message: "Plan removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["platformPlans"] });
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const togglePlan = useMutation({
    mutationFn: ({ id, isActive }: { id: number, isActive: boolean }) => endpoints.togglePlatformPlan(id, isActive),
    onSuccess: (_, variables) => {
      pushToast({ kind: "success", title: "Status Updated", message: `Plan is now ${variables.isActive ? 'active' : 'inactive'}.` });
      queryClient.invalidateQueries({ queryKey: ["platformPlans"] });
    },
    onError: (err) => pushToast({ kind: "error", title: "Action Failed", message: getErrorMessage(err) })
  });

  const handleSavePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const featuresList = formData.get("features")?.toString().split(",").map(f => f.trim()).filter(Boolean);
    
    const payload = {
      name: formData.get("planName"),
      monthlyPrice: Number(formData.get("monthlyPrice")),
      quarterlyPrice: 0,
      halfYearlyPrice: 0,
      yearlyPrice: 0,
      maxStudents: Number(formData.get("maxStudents")),
      maxStaff: 5,
      isRecommended: formData.get("isRecommended") === "on",
      features: featuresList
    };

    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, payload });
    } else {
      createPlan.mutate(payload);
    }
  };

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings.mutate({
      merchantName: formData.get("merchantName"),
      upiId: formData.get("upiId"),
      paymentInstructions: formData.get("paymentInstructions")
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Platform Licensing
        </h1>
        <p className="text-muted mt-1">Manage library subscriptions, platform plans, and payment settings.</p>
      </div>

      <div className="w-full">
        <div className="flex w-full space-x-2 mb-8 bg-muted/30 p-1 rounded-xl max-w-lg">
          <button 
            onClick={() => setActiveTab("payments")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'payments' ? 'bg-background shadow text-foreground' : 'text-muted hover:bg-muted/50'}`}
          >
            Library Payments
          </button>
          <button 
            onClick={() => setActiveTab("plans")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'plans' ? 'bg-background shadow text-foreground' : 'text-muted hover:bg-muted/50'}`}
          >
            Subscription Plans
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-background shadow text-foreground' : 'text-muted hover:bg-muted/50'}`}
          >
            Payment Settings
          </button>
        </div>

        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="bg-panel rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted uppercase font-semibold text-xs">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Plan</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">UTR Number</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments?.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">#{payment.id}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{payment.planName}</td>
                      <td className="px-6 py-4 font-bold">₹{payment.amount}</td>
                      <td className="px-6 py-4 font-mono">{payment.utrNumber}</td>
                      <td className="px-6 py-4 text-muted">{new Date(payment.submittedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          payment.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                          payment.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {payment.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => approvePayment.mutate(payment.id)}
                              loading={approvePayment.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white !py-1 !px-3 h-8 text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button 
                              onClick={() => rejectPayment.mutate(payment.id)}
                              loading={rejectPayment.isPending}
                              variant="danger"
                              className="!py-1 !px-3 h-8 text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!payments?.length && !paymentsLoading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted">No payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "plans" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setEditingPlan(null);
                setIsCreatePlanOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" /> Create Plan
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {plans?.map((plan: any) => (
                <div key={plan.id} className={`p-6 rounded-2xl border ${plan.isRecommended ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' : 'bg-panel border-border'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {plan.planName}
                        {!plan.isActive && <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Inactive</span>}
                      </h3>
                      {plan.isRecommended && <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-bold uppercase inline-block mt-1">Pro</span>}
                    </div>
                    <div className="flex items-center gap-2 -mt-2 -mr-2">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        title="Edit Plan"
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsCreatePlanOpen(true);
                        }}
                        icon={<Edit3 className="w-4 h-4" />}
                      />
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        title={plan.isActive ? "Deactivate Plan" : "Activate Plan"}
                        onClick={() => togglePlan.mutate({ id: plan.id, isActive: !plan.isActive })}
                        className="text-muted hover:text-foreground"
                        icon={plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      />
                      <Button 
                        variant="danger" 
                        size="icon" 
                        title="Delete Plan"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this plan?")) {
                            deletePlan.mutate(plan.id);
                          }
                        }}
                        icon={<Trash2 className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-foreground mb-6">
                    ₹{plan.monthlyPrice} <span className="text-base text-muted font-normal">/mo</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Max Students: {plan.maxStudents}
                    </div>
                    {plan.features?.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!plans?.length && !plansLoading && (
                <div className="col-span-3 text-center py-12 text-muted border border-border rounded-xl">
                  No subscription plans created yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <form onSubmit={handleSaveSettings} className="bg-panel rounded-xl border border-border p-6 max-w-2xl">
              <h3 className="text-lg font-bold text-foreground mb-6">Payment Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted block mb-1">Merchant Name</label>
                  <input type="text" name="merchantName" required className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={settings?.merchantName} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted block mb-1">UPI ID</label>
                  <input type="text" name="upiId" required className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={settings?.upiId} />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted block mb-1">Payment Instructions</label>
                  <textarea name="paymentInstructions" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none h-24" defaultValue={settings?.paymentInstructions} />
                </div>
                <Button type="submit" loading={updateSettings.isPending} className="w-full">Save Settings</Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <Modal open={isCreatePlanOpen} onClose={() => { setIsCreatePlanOpen(false); setEditingPlan(null); }} title={editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}>
        <form id="createPlanForm" onSubmit={handleSavePlan} className="space-y-4 py-4 min-w-[300px] md:min-w-[400px]">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Plan Name</label>
            <input type="text" name="planName" required placeholder="e.g. Starter Plan" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={editingPlan?.planName} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Monthly Price (₹)</label>
              <input type="number" name="monthlyPrice" required placeholder="999" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={editingPlan?.monthlyPrice} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Max Students</label>
              <input type="number" name="maxStudents" required placeholder="50" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={editingPlan?.maxStudents} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Features (comma separated)</label>
            <textarea name="features" placeholder="Unlimited seats, Premium support..." className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none h-24" defaultValue={editingPlan?.features?.join(", ")} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" name="isRecommended" id="isRecommended" className="h-4 w-4 rounded border-border" defaultChecked={editingPlan?.isRecommended} />
            <label htmlFor="isRecommended" className="text-sm text-foreground">Highlight as Recommended Plan</label>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => { setIsCreatePlanOpen(false); setEditingPlan(null); }}>Cancel</Button>
            <Button type="submit" loading={createPlan.isPending || updatePlan.isPending}>{editingPlan ? "Update Plan" : "Create Plan"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
