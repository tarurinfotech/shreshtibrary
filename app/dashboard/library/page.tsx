"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { AchieversSection } from "@/components/features/library/AchieversSection";
import { FacilitiesSection } from "@/components/features/library/FacilitiesSection";
import { LibraryInfoForm } from "@/components/features/library/LibraryInfoForm";
import { PublicReviewsSection } from "@/components/features/library/PublicReviewsSection";
import { useAuthStore } from "@/store/authStore";

export default function LibraryPage() {
  const currentUser = useAuthStore((state) => state.user);

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key) || currentUser.permissions.includes("all");
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canEditInfo = hasPerm("LibraryManagement.Info");
  const canManageFacilities = hasPerm("LibraryManagement.Facilities");
  const canManageAchievers = hasPerm("LibraryManagement.Achiever");
  const canManageGallery = hasPerm("LibraryManagement.Gallery");

  return (
    <>
      <PageHeader title="Library" eyebrow="Public Content" />
      
      <div className="space-y-6">
        <LibraryInfoForm canEditInfo={canEditInfo} canManageGallery={canManageGallery} />
        
        <FacilitiesSection canManageFacilities={canManageFacilities} />
        
        <AchieversSection canManageAchievers={canManageAchievers} />
        
        <PublicReviewsSection />
      </div>
    </>
  );
}
