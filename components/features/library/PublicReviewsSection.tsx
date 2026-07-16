"use client";

import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";

export function PublicReviewsSection() {
  const reviews = useQuery({ queryKey: ["public-reviews"], queryFn: () => endpoints.publicReviews() });
  const reviewSummary = useQuery({ queryKey: ["review-summary"], queryFn: () => endpoints.reviewSummary() });

  return (
    <section className="surface rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Public Reviews</h2>
        <Badge variant="success">{reviewSummary.data?.count ?? reviews.data?.count ?? 0}</Badge>
      </div>
      {reviews.isLoading ? (
        <div className="py-8 text-center text-sm text-muted">Loading reviews...</div>
      ) : reviews.error ? (
        <div className="py-8 text-center text-sm text-red-500">Failed to load reviews</div>
      ) : reviews.data?.data?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted">No public reviews available.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(reviews.data?.data ?? []).slice(0, 6).map((review) => (
            <article key={review.id} className="rounded-lg border border-border bg-panel-strong p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{review.student_name}</h3>
                  <p className="mt-1 text-xs text-muted">{formatDate(review.created_at)}</p>
                </div>
                <div className="flex gap-1 text-amber-300" role="img" aria-label={`Rating: ${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className={index < review.rating ? "h-4 w-4 fill-current" : "h-4 w-4 text-muted"} aria-hidden="true" />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">{review.comment}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
