"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star, Trash2, XCircle } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PromptDialog } from "@/components/ui/Dialog";
import { FormActions } from "@/components/ui/Form";
import { MetricTile } from "@/components/ui/MetricTile";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { Review } from "@/types/api";

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [filter, setFilter] = useState("all");
  const [rejectTarget, setRejectTarget] = useState<Review | null>(null);
  const reviews = useQuery({ queryKey: ["reviews"], queryFn: () => endpoints.reviews() });
  const pending = useQuery({ queryKey: ["pending-reviews"], queryFn: () => endpoints.pendingReviews() });
  const summary = useQuery({ queryKey: ["review-summary"], queryFn: () => endpoints.reviewSummary() });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["pending-reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["public-reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["review-summary"] });
  };

  const approve = useMutation({
    mutationFn: (id: number) => endpoints.approveReview(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Review approved" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Approval failed", message: getErrorMessage(error) }),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => endpoints.rejectReview(id, reason),
    onSuccess: async () => {
      await invalidate();
      setRejectTarget(null);
      pushToast({ kind: "success", title: "Review rejected" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Reject failed", message: getErrorMessage(error) }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => endpoints.deleteReview(id),
    onSuccess: async () => {
      await invalidate();
      pushToast({ kind: "success", title: "Review deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const filtered = useMemo(
    () => {
      const source = filter === "pending-only" ? pending.data?.data ?? [] : reviews.data?.data ?? [];
      return source.filter((review) => {
        if (filter === "approved") return Boolean(review.is_approved);
        if (filter === "pending" || filter === "pending-only") return !review.is_approved && !review.rejection_reason;
        if (filter === "rejected") return Boolean(review.rejection_reason);
        return true;
      });
    },
    [filter, pending.data, reviews.data],
  );

  return (
    <>
      <PageHeader title="Reviews" eyebrow="Moderation" />
      <div className="grid gap-3 md:grid-cols-3">
        <MetricTile label="Average" value={Number(summary.data?.average_rating ?? 0).toFixed(1)} />
        <MetricTile label="Approved" value={summary.data?.count ?? 0} />
        <MetricTile label="Pending" value={pending.data?.count ?? 0} />
      </div>

      <div className="max-w-xs">
        <Select
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "pending-only", label: "Pending Endpoint" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </div>

      {reviews.isLoading ? <LoadingBlock label="Loading reviews" /> : null}
      {reviews.error ? <ErrorState message="Unable to load reviews." /> : null}
      {!reviews.isLoading && !reviews.error && filtered.length === 0 ? <EmptyState title="No reviews found" /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((review) => (
          <article key={review.id} className="surface grid gap-4 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{review.student_name}</h2>
                <p className="mt-1 text-sm text-muted">{formatDate(review.created_at)}</p>
              </div>
              <Badge variant={statusVariant(review.rejection_reason ? "failed" : review.is_approved ? "approved" : "pending")}>
                {review.rejection_reason ? "Rejected" : review.is_approved ? "Approved" : "Pending"}
              </Badge>
            </div>
            <div className="flex gap-1 text-amber-300" aria-label={`${review.rating} star rating`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className={index < review.rating ? "h-4 w-4 fill-current" : "h-4 w-4 text-muted"} />
              ))}
            </div>
            <p className="text-sm leading-6 text-foreground">{review.comment}</p>
            {review.rejection_reason ? <p className="text-xs text-danger">{review.rejection_reason}</p> : null}
            <FormActions>
              <Button variant="success" size="sm" disabled={Boolean(review.is_approved)} loading={approve.isPending} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => approve.mutate(review.id)}>Approve</Button>
              <Button variant="secondary" size="sm" loading={reject.isPending} icon={<XCircle className="h-4 w-4" />} onClick={() => setRejectTarget(review)}>Reject</Button>
              <Button variant="danger" size="sm" loading={remove.isPending} icon={<Trash2 className="h-4 w-4" />} onClick={() => remove.mutate(review.id)}>Delete</Button>
            </FormActions>
          </article>
        ))}
      </div>

      <PromptDialog
        open={Boolean(rejectTarget)}
        title="Reject Review"
        message={rejectTarget ? `Provide a reason for rejecting ${rejectTarget.student_name}'s review.` : undefined}
        label="Reject Reason"
        confirmLabel="Reject"
        loading={reject.isPending}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => rejectTarget && reject.mutate({ id: rejectTarget.id, reason })}
      />
    </>
  );
}
