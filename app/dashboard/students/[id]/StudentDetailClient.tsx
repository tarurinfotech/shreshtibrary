"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeft, Camera, Clock, Upload, CheckCircle, Calendar, Plus } from "lucide-react";
import { StudentEditForm } from "@/components/features/students/StudentEditForm";
import { StudentAttendanceCalendar } from "@/components/features/students/StudentAttendanceCalendar";
import { useAuthStore } from "@/store/authStore";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { getErrorMessage } from "@/lib/api";
import { endpoints, type StudentUpdatePayload } from "@/lib/endpoints";
import { formatDate, formatMoney } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { useToastStore } from "@/store/toastStore";
import { StudentPlanDetails } from "@/components/features/students/StudentPlanDetails";
import { StudentHistoryGrid } from "@/components/features/students/StudentHistoryGrid";
import { StudentAnalyticsSection } from "@/components/features/students/StudentAnalyticsSection";
import { StudentRecentAttendance } from "@/components/features/students/StudentRecentAttendance";

export function StudentDetailClient({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const currentUser = useAuthStore((state) => state.user);

  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key) || currentUser.permissions.includes("all");
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canEdit = hasPerm("StudentManagement.Edit");
  const canAssignPlan = hasPerm("Membership.Create");

  const [photo, setPhoto] = useState<File | null>(null);
  const student = useQuery({ queryKey: ["student", id], queryFn: () => endpoints.student(id) });

  const update = useMutation({
    mutationFn: (payload: StudentUpdatePayload) => endpoints.updateStudent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      pushToast({ kind: "success", title: "Student updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) }),
  });

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => endpoints.uploadStudentPhoto(id, file),
    onSuccess: () => {
      setPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      pushToast({ kind: "success", title: "Profile image updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Upload failed", message: getErrorMessage(error) }),
  });

  if (student.isLoading) {
    return <LoadingBlock label="Loading student" />;
  }

  if (student.error || !student.data) {
    return <ErrorState message="Unable to load this student." />;
  }

  const studentName = [student.data.first_name, student.data.middle_name, student.data.last_name].filter(Boolean).join(" ") || student.data.username;

  return (
    <>
      <PageHeader
        title={studentName}
        eyebrow={student.data.student_id ?? "Student Detail"}
        actions={
          <Link href="/dashboard/students" className={buttonClasses({ variant: "secondary" })}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="surface rounded-lg p-5">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={student.data.profile_image ?? student.data.profile_photo}
              name={studentName}
              size="2xl"
              shape="circle"
              status={student.data.status}
              asBackground
            />
            <h2 className="mt-3 text-lg font-semibold">{studentName}</h2>
            <Badge variant={statusVariant(student.data.status)}>{student.data.status}</Badge>
          </div>

          {canEdit && (
            <div className="mt-5 rounded-lg border border-border bg-panel-strong p-3">
              <FileInput
                accept="image/*"
                label="Profile Image"
                fileName={photo ? `${photo.name} selected` : null}
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              <Button
                className="mt-3 w-full"
                disabled={!photo}
                icon={<Upload className="h-4 w-4" />}
                loading={uploadPhoto.isPending}
                onClick={() => photo && uploadPhoto.mutate(photo)}
                type="button"
              >
                Upload Image
              </Button>
            </div>
          )}

          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-muted">Username</dt>
              <dd className="mt-1">{student.data.username}</dd>
            </div>
            <div>
              <dt className="text-muted">Mobile</dt>
              <dd className="mt-1">{student.data.mobile}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="mt-1">{student.data.email || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted">Date of Birth</dt>
              <dd className="mt-1">{formatDate(student.data.dob)}</dd>
            </div>

          </dl>
        </aside>

        <StudentEditForm
          key={student.data.updated_at || student.data.user_id}
          student={student.data}
          saving={update.isPending}
          onSubmit={(payload) => update.mutate(payload)}
          readOnly={!canEdit}
        />
      </div>
        <StudentPlanDetails studentId={id} canAssignPlan={canAssignPlan} />

        <StudentHistoryGrid studentId={id} />

        <StudentAnalyticsSection studentId={id} joiningDate={student.data?.joining_date ?? undefined} />

        <StudentRecentAttendance studentId={id} />
    </>
  );
}
