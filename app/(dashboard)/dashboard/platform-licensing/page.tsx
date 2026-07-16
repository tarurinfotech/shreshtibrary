"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { endpoints } from "@/lib/endpoints";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Plus, CheckCircle2, QrCode } from "lucide-react";
import { getErrorMessage } from "@/lib/api";

export default function PlatformLicensingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("payments");

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
      toast.success("Payment approved & subscription activated!");
      queryClient.invalidateQueries({ queryKey: ["libraryPayments"] });
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  // Basic layout for the super admin
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          Platform Licensing
        </h1>
        <p className="text-muted mt-1">Manage library subscriptions, platform plans, and payment settings.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="payments">Library Payments</TabsTrigger>
          <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          <TabsTrigger value="settings">Payment Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
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
                        <Button 
                          size="sm" 
                          onClick={() => approvePayment.mutate(payment.id)}
                          disabled={approvePayment.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </Button>
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
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Create Plan
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans?.map((plan: any) => (
              <div key={plan.id} className={`p-6 rounded-2xl border ${plan.isRecommended ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' : 'bg-panel border-border'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-foreground">{plan.planName}</h3>
                  {plan.isRecommended && <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-bold uppercase">Pro</span>}
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
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="bg-panel rounded-xl border border-border p-6 max-w-2xl">
            <h3 className="text-lg font-bold text-foreground mb-6">Payment Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted block mb-1">Merchant Name</label>
                <input type="text" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={settings?.merchantName} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted block mb-1">UPI ID</label>
                <input type="text" className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none" defaultValue={settings?.upiId} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted block mb-1">Payment Instructions</label>
                <textarea className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none h-24" defaultValue={settings?.paymentInstructions} />
              </div>
              <Button className="w-full">Save Settings</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
