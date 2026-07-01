"use client";

import axios from "axios";
import { api, downloadFile, unwrap, unwrapPage } from "./api";
import type {
  ActivityLogItem,
  AdminProfile,
  AdminUser,
  Achiever,
  AdminInboxNotificationRecord,
  AlertItem,
  ApiResponse,
  AttendanceRecord,
  DashboardChart,
  DashboardStats,
  Facility,
  Floor,
  HolidayRecord,
  LibraryInfo,
  ListParams,
  LoginResponse,
  MembershipPlan,
  MembershipRecord,
  NotificationRecipient,
  NotificationRecord,
  PaginatedResponse,
  PaymentRecord,
  QRCodeRecord,
  Review,
  Seat,
  SeatHistoryItem,
  SeatReport,
  SeatRow,
  StudentProfile,
  StudentAnalytics,
  StudentTimelineItem,
  HomeSlider,
} from "@/types/api";

type Query = Record<string, string | number | boolean | undefined>;

async function getData<T>(url: string, params?: Query) {
  return unwrap<T>(await api.get<ApiResponse<T>>(url, { params }));
}

async function postData<T>(url: string, payload?: unknown) {
  return unwrap<T>(await api.post<ApiResponse<T>>(url, payload ?? {}));
}

async function putData<T>(url: string, payload?: unknown) {
  return unwrap<T>(await api.put<ApiResponse<T>>(url, payload ?? {}));
}

function toFormData(payload: Record<string, unknown> = {}, files: Record<string, File | null | undefined> = {}) {
  const formData = new FormData();
  const skipKeys = new Set(["id", "created_at", "updated_at", "profile_photo", "profile_image", "photo", "feature_image"]);

  Object.entries(payload).forEach(([key, value]) => {
    if (skipKeys.has(key) || value === undefined || value === null) {
      return;
    }
    const isFile = typeof File !== "undefined" && value instanceof File;
    if (Array.isArray(value) || (typeof value === "object" && !isFile)) {
      formData.append(key, JSON.stringify(value));
      return;
    }
    formData.append(key, String(value));
  });

  Object.entries(files).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file);
    }
  });

  return formData;
}

async function postMultipart<T>(url: string, formData: FormData) {
  return unwrap<T>(
    await api.post<ApiResponse<T>>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
}

async function putMultipart<T>(url: string, formData: FormData) {
  return unwrap<T>(
    await api.put<ApiResponse<T>>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  );
}

async function patchData<T>(url: string, payload?: unknown) {
  return unwrap<T>(await api.patch<ApiResponse<T>>(url, payload ?? {}));
}

async function deleteData<T>(url: string) {
  return unwrap<T>(await api.delete<ApiResponse<T>>(url));
}

async function getPage<T>(url: string, params?: Query) {
  return unwrapPage<T>(await api.get<PaginatedResponse<T>>(url, { params }));
}

async function getAllPages<T>(url: string, params?: Query) {
  const pageSize = Number(params?.page_size ?? 100);
  const firstPage = await getPage<T>(url, { ...params, page: 1, page_size: pageSize });
  const rows = [...firstPage.data];

  const maxPages = Math.min(firstPage.total_pages, 20); // Hard cap to prevent infinite loops / DoS

  if (maxPages > 1) {
    const promises = [];
    for (let page = 2; page <= maxPages; page += 1) {
      promises.push(getPage<T>(url, { ...params, page, page_size: pageSize }));
    }
    const nextPages = await Promise.all(promises);
    for (const nextPage of nextPages) {
      rows.push(...nextPage.data);
    }
  }

  return rows;
}

export type StudentUpdatePayload = Partial<
  Pick<
    StudentProfile,
    | "first_name"
    | "middle_name"
    | "last_name"
    | "email"
    | "mobile"
    | "is_active"
    | "goal"
    | "dob"
    | "gender"
    | "caste"
    | "address"
    | "parent_mobile"
    | "status"
    | "preferred_language"
  >
>;

export type StudentCreatePayload = StudentUpdatePayload & {
  username?: string;
  password?: string;
  mobile: string;
};

export type PlanUpdatePayload = Partial<
  Pick<
    MembershipPlan,
    | "name"
    | "duration_months"
    | "duration_days"
    | "price"
    | "benefits"
    | "description"
    | "is_active"
    | "sort_order"
  >
>;

export type MembershipPayload = {
  student_id: number;
  plan_id: number;
  start_date?: string;
  end_date?: string;
  notes?: string;
};

export type PaymentPayload = {
  student_id: number;
  plan_id?: number;
  duration_days?: number;
  duration_type?: '1_month' | '2_months' | '3_months' | 'custom';
  payment_mode?: string;
  transaction_ref?: string;
  notes?: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  type: string;
  target?: string;
  target_group: string;
  goal_filter?: string;
  status_filter?: string;
  send_push?: boolean;
  send_email?: boolean;
  send_sms?: boolean;
  scheduled_at?: string;
  subtitle?: string;
  description?: string;
  link_url?: string;
  link_button_text?: string;
  event_date?: string;
  layout: string;
  audience: string;
  display_mode: string;
  recurring_time?: string;
  expires_at?: string;
  selected_students?: string; // Comma-separated list of IDs
};

export const endpoints = {
  // Auth
  login: async (payload: { username: string; password: string }) => {
    // Call the local Next.js API route to handle secure cookies
    const res = await axios.post<{ data: LoginResponse }>("/api/auth/login", payload);
    return res.data.data;
  },

  me: () => getData<AdminUser>("/auth/me/"),

  adminProfile: () => getData<AdminProfile>("/admin/profile/"),

  updateAdminProfile: (payload: Partial<AdminProfile>, image?: File | null) =>
    putMultipart<AdminProfile>("/admin/profile/", toFormData(payload, { profile_image: image })),

  changePassword: (payload: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => postData<unknown>("/auth/change-password/", payload),

  updateFcmToken: (payload: { token: string }) =>
    postData<unknown>("/auth/fcm-token/update/", payload),

  settings: () => getData<any>("/admin/settings/"),

  updateSettings: (payload: Record<string, unknown>) =>
    putData<Record<string, unknown>>("/admin/settings/", payload),

  // Dashboard
  dashboardStats: () => getData<DashboardStats>("/dashboard/stats/"),

  dashboardStatsSection: (section: string) =>
    getData<Record<string, unknown>>(`/dashboard/stats/${section}/`),

  dashboardChart: (domain: string, chart = "overview") =>
    getData<DashboardChart>(`/dashboard/charts/${domain}/${chart}/`),

  dashboardCharts: (range = "month") =>
    getData<any>(`/dashboard/charts/`, { range }),

  dashboardActivityRecent: () =>
    getData<ActivityLogItem[]>("/dashboard/activity/recent/"),

  dashboardActivityLog: () => getData<ActivityLogItem[]>("/dashboard/activity/log/"),

  exportActivityLog: () => downloadFile("/dashboard/activity/export/", "activity-log.xlsx"),

  dashboardAlerts: () => getData<AlertItem[]>("/dashboard/alerts/"),
  
  globalSearch: (query: string) => getData<{ students: StudentProfile[]; seats: Seat[]; payments: PaymentRecord[] }>("/admin/search/", { q: query }),

  // Students
  students: (params?: ListParams) => getPage<StudentProfile>("/admin/students/", params),

  allStudents: (params?: ListParams) =>
    getAllPages<StudentProfile>("/admin/students/", { page_size: 100, ...params }),

  student: (id: string | number) => getData<StudentProfile>(`/admin/students/${id}/`),

  createStudent: (payload: StudentCreatePayload) =>
    postData<StudentProfile>("/admin/students/", payload),

  updateStudent: (id: string | number, payload: StudentUpdatePayload) =>
    putData<StudentProfile>(`/admin/students/${id}/`, payload),

  uploadStudentPhoto: (id: string | number, image: File) =>
    postMultipart<StudentProfile>(`/admin/students/${id}/photo/`, toFormData({}, { profile_photo: image })),

  deleteStudent: (id: string | number) => deleteData<unknown>(`/admin/students/${id}/`),

  suspendStudent: (id: string | number, reason: string) =>
    postData<StudentProfile>(`/admin/students/${id}/suspend/`, { reason }),

  activateStudent: (id: string | number) =>
    postData<StudentProfile>(`/admin/students/${id}/activate/`),

  studentTimeline: (id: string | number) =>
    getData<StudentTimelineItem[]>(`/admin/students/${id}/timeline/`),

  studentPayments: (id: string | number) =>
    getData<PaymentRecord[]>(`/admin/students/${id}/payments/`),

  studentAttendance: (id: string | number) =>
    getData<AttendanceRecord[]>(`/admin/students/${id}/attendance/`),

  studentAnalytics: (id: string | number, period: StudentAnalytics["period"]) =>
    getData<StudentAnalytics>(`/admin/students/${id}/analytics/`, { period }),

  studentCounts: () =>
    getData<{ total: number; live: number; expired: number; suspended: number; pending: number; girls?: number; boys?: number; other?: number }>(
      "/admin/students/counts/",
    ),

  exportStudents: (format = "csv") =>
    downloadFile("/admin/students/export/", `students.${format}`, { format }),

  // Plans and Memberships
  publicPlans: () => getData<MembershipPlan[]>("/plans/"),

  plans: () => getData<MembershipPlan[]>("/admin/plans/"),

  createPlan: (payload: PlanUpdatePayload) =>
    postData<MembershipPlan>("/admin/plans/create/", payload),

  updatePlan: (id: number, payload: PlanUpdatePayload) =>
    putData<MembershipPlan>(`/admin/plans/${id}/`, payload),

  deletePlan: (id: number) => deleteData<unknown>(`/admin/plans/${id}/`),

  togglePlan: (id: number, is_active?: boolean) =>
    patchData<MembershipPlan>(`/admin/plans/${id}/toggle/`, { is_active }),

  planStats: () =>
    getData<Array<MembershipPlan & { active_students: number; all_time_students: number }>>(
      "/admin/plans/stats/",
    ),

  planStudents: (id: number) => getData<StudentProfile[]>(`/admin/plans/${id}/students/`),

  memberships: (params?: ListParams) => getPage<MembershipRecord>("/admin/memberships/", params),

  studentMemberships: (studentId: number) =>
    getPage<MembershipRecord>("/admin/memberships/", { student_id: studentId, page_size: 20 }),

  membership: (id: number) => getData<MembershipRecord>(`/admin/memberships/${id}/`),

  assignMembership: (payload: MembershipPayload) =>
    postData<MembershipRecord>("/admin/memberships/assign/", payload),

  renewMembership: (payload: MembershipPayload) =>
    postData<MembershipRecord>("/admin/memberships/renew/", payload),

  upgradeMembership: (payload: MembershipPayload) =>
    postData<MembershipRecord>("/admin/memberships/upgrade/", payload),

  updateMembership: (id: number, payload: Partial<MembershipRecord>) =>
    putData<MembershipRecord>(`/admin/memberships/${id}/`, payload),

  expiringMemberships: (days = 7) =>
    getData<MembershipRecord[]>("/admin/memberships/expiring/", { days }),

  expiredTodayMemberships: () =>
    getData<MembershipRecord[]>("/admin/memberships/expired-today/"),

  // QR and Attendance
  currentQr: () => getData<QRCodeRecord | null>("/admin/qr/current/"),

  qrHistory: (params?: ListParams) => getPage<QRCodeRecord>("/admin/qr/history/", params),

  generateQr: (payload?: { expiry_duration?: string }) => postData<QRCodeRecord>("/admin/qr/generate/", payload ?? {}),

  regenerateQr: (payload?: { expiry_duration?: string }) => postData<QRCodeRecord>("/admin/qr/regenerate/", payload ?? {}),

  expireQr: () => postData<unknown>("/admin/qr/expire/"),
  
  deleteQr: (id: number) => deleteData<unknown>(`/admin/qr/${id}/`),

  qrScans: (id: number) => getData<AttendanceRecord[]>(`/admin/qr/${id}/scans/`),

  attendance: (params?: Query) => getPage<AttendanceRecord>("/admin/attendance/", params),

  allAttendance: (params?: Query) =>
    getAllPages<AttendanceRecord>("/admin/attendance/", { page_size: 100, ...params }),

  manualAttendance: (payload: {
    student_id?: number;
    student_mobile?: string;
    date?: string;
    is_present?: boolean;
    note?: string;
  }) => postData<AttendanceRecord>("/admin/attendance/manual/", payload),

  manualAttendanceBulk: (payload: Array<{
    student_id?: number;
    student_mobile?: string;
    date?: string;
    is_present?: boolean;
    note?: string;
  }>) => postData<{ success: boolean; message: string }>("/admin/attendance/manual/bulk/", payload),

  updateAttendance: (id: number, payload: Partial<AttendanceRecord>) =>
    putData<AttendanceRecord>(`/admin/attendance/${id}/`, payload),

  deleteAttendance: (id: number) => deleteData<unknown>(`/admin/attendance/${id}/`),

  attendanceDailySummary: (date?: string) =>
    getData<{ date: string; present: number; absent: number; pending: number; total: number }>(
      "/admin/attendance/daily-summary/",
      { date },
    ),

  attendanceAbsentees: (date?: string) =>
    getData<StudentProfile[]>("/admin/attendance/absentees/", { date }),

  attendanceStreak: () =>
    getData<Array<{ student: StudentProfile; streak: number }>>("/admin/attendance/streak/"),

  holidays: (params?: Query) => getData<HolidayRecord[]>("/holidays/", params),

  createHoliday: (payload: Partial<HolidayRecord>) =>
    postData<HolidayRecord>("/admin/holidays/", payload),

  updateHoliday: (id: number, payload: Partial<HolidayRecord>) =>
    putData<HolidayRecord>(`/admin/holidays/${id}/`, payload),

  deleteHoliday: (id: number) => deleteData<unknown>(`/admin/holidays/${id}/`),

  // Payments
  payments: (params?: ListParams) => getPage<PaymentRecord>("/admin/payments/", params),

  createPayment: (payload: PaymentPayload) => postData<PaymentRecord>("/admin/payments/", payload),

  payment: (id: number) => getData<PaymentRecord>(`/admin/payments/${id}/`),

  updatePayment: (id: number, payload: Partial<PaymentRecord>) =>
    putData<PaymentRecord>(`/admin/payments/${id}/`, payload),

  verifyPayment: (id: number) => postData<PaymentRecord>(`/admin/payments/${id}/verify/`),

  refundPayment: (id: number, payload: { refund_amount?: string | number; refund_reason?: string }) =>
    postData<PaymentRecord>(`/admin/payments/${id}/refund/`, payload),

  downloadReceipt: (id: number) => downloadFile(`/admin/payments/${id}/receipt`, `receipt-${id}.pdf`),

  sendReceipt: (id: number) => postData<{ message: string }>(`/admin/payments/${id}/send-receipt`),

  paymentSummary: () =>
    getData<{
      today_amount: string;
      today_count: number;
      month_amount: string;
      year_amount: string;
      all_time_amount: string;
      pending_count: number;
    }>("/admin/payments/summary/"),

  pendingPayments: () => getData<PaymentRecord[]>("/admin/payments/pending/"),

  overduePayments: () => getData<PaymentRecord[]>("/admin/payments/overdue/"),

  // Seats
  seatLayout: () => getData<Floor[]>("/admin/seats/layout/"),

  seats: (params?: ListParams) => getPage<Seat>("/admin/seats/", params),

  flatSeats: async () => (await getPage<Seat>("/admin/seats/", { page_size: 200 })).data ?? [],

  addSeat: (payload: Partial<Seat>) => postData<Seat>("/admin/seats/", payload),

  updateSeat: (id: number, payload: Partial<Seat>) =>
    putData<Seat>(`/admin/seats/${id}/`, payload),

  updateSeatStatus: (id: number, payload: { status: string; reason?: string }) =>
    patchData<Seat>(`/admin/seats/${id}/status/`, payload),

  assignSeat: (id: number, student_id: number | string) =>
    postData<Seat>(`/admin/seats/${id}/assign/`, { student_id }),

  unassignSeat: (id: number, reason?: string) =>
    postData<Seat>(`/admin/seats/${id}/unassign/`, { reason }),

  availableSeats: () => getData<Seat[]>("/admin/seats/available/"),

  seatHistory: (id: number) => getData<SeatHistoryItem[]>(`/admin/seats/${id}/history/`),

  seatStats: () => getData<SeatReport>("/admin/seats/stats/"),
  
  releaseAllSeats: () => postData<unknown>("/admin/seats/release-all/"),

  reserveBulkSeats: (payload: { seat_ids: number[]; is_reserved_for_girls: boolean }) =>
    postData<unknown>("/admin/seats/reserve-bulk/", payload),

  deleteSeat: (id: number) => deleteData<unknown>(`/admin/seats/${id}/`),

  createFloor: (payload: { name: string; description?: string; order?: number }) =>
    postData<Floor>("/admin/floors/", payload),

  updateFloor: (id: number, payload: Partial<Floor>) =>
    putData<Floor>(`/admin/floors/${id}/`, payload),

  deleteFloor: (id: number) => deleteData<unknown>(`/admin/floors/${id}/`),

  createRow: (payload: { floor_id: number; label: string; order?: number }) =>
    postData<SeatRow>("/admin/rows/", payload),

  updateRow: (id: number, payload: { label?: string; order?: number }) =>
    putData<SeatRow>(`/admin/rows/${id}/`, payload),

  deleteRow: (id: number) => deleteData<unknown>(`/admin/rows/${id}/`),

  // Notifications
  notifications: (params?: ListParams) => getPage<NotificationRecord>("/admin/notifications/", params),

  sendNotification: (payload: FormData) =>
    postData<NotificationRecord>("/admin/notifications/send/", payload),

  notification: (id: number) => getData<NotificationRecord>(`/admin/notifications/${id}/`),

  notificationRecipients: (id: number) =>
    getData<NotificationRecipient[]>(`/admin/notifications/${id}/recipients/`),

  scheduleNotification: (payload: FormData) =>
    postData<NotificationRecord>("/admin/notifications/schedule/", payload),

  scheduledNotifications: () =>
    getData<NotificationRecord[]>("/admin/notifications/scheduled/"),

  cancelScheduledNotification: (id: number) =>
    deleteData<unknown>(`/admin/notifications/scheduled/${id}/cancel/`),

  notificationTemplates: () =>
    getData<Array<{ id: string; title: string; body: string }>>("/admin/notifications/templates/"),

  // Admin Inbox
  adminInbox: () => getData<AdminInboxNotificationRecord[]>("/admin/inbox/"),
  adminInboxAction: (id: number, action: "read" | "unread") => postData<unknown>(`/admin/inbox/${id}/${action}/`),
  deleteAdminInbox: (id: number) => deleteData<unknown>(`/admin/inbox/${id}/`),

  // Library Content
  libraryInfo: () => getData<LibraryInfo>("/admin/library/info/"),

  updateLibraryInfo: (payload: Partial<LibraryInfo>, featureImage?: File | null) =>
    postMultipart<LibraryInfo>("/admin/library/info/", toFormData(payload, { feature_image: featureImage })),

  facilities: () => getData<Facility[]>("/admin/library/facilities/"),

  createFacility: (payload: Partial<Facility>, image?: File | null) =>
    postMultipart<Facility>("/admin/library/facilities/", toFormData(payload, { image })),

  updateFacility: (id: number, payload: Partial<Facility>, image?: File | null) =>
    putMultipart<Facility>(`/admin/library/facilities/${id}/`, toFormData(payload, { image })),

  deleteFacility: (id: number) => deleteData<unknown>(`/admin/library/facilities/${id}/`),

  toggleFacility: (id: number, is_active?: boolean) =>
    patchData<Facility>(`/admin/library/facilities/${id}/toggle/`, { is_active }),

  reorderFacilities: (items: Array<{ id: number; order: number }>) =>
    patchData<unknown>("/admin/library/facilities/reorder/", { items }),

  achievers: () => getData<Achiever[]>("/admin/library/achievers/"),

  publicAchievers: () => getData<Achiever[]>("/library/achievers/"),

  createAchiever: (payload: Partial<Achiever>, photo?: File | null) =>
    postMultipart<Achiever>("/admin/library/achievers/", toFormData(payload, { photo })),

  updateAchiever: (id: number, payload: Partial<Achiever>, photo?: File | null) =>
    putMultipart<Achiever>(`/admin/library/achievers/${id}/`, toFormData(payload, { photo })),

  deleteAchiever: (id: number) => deleteData<unknown>(`/admin/library/achievers/${id}/`),

  toggleAchiever: (id: number, is_active?: boolean) =>
    patchData<Achiever>(`/admin/library/achievers/${id}/toggle/`, { is_active }),

  reorderAchievers: (items: Array<{ id: number; order: number }>) =>
    patchData<unknown>("/admin/library/achievers/reorder/", { items }),

  publicReviews: () => getData<Review[]>("/admin/library/reviews/"),

  reviewSummary: () =>
    getData<{ average_rating: number; count: number; breakdown: Record<number, number> }>(
      "/admin/library/reviews/summary/",
    ),

  reviews: () => getData<Review[]>("/admin/reviews/"),

  pendingReviews: () => getData<Review[]>("/admin/reviews/pending/"),

  approveReview: (id: number) => postData<Review>(`/admin/reviews/${id}/approve/`),

  rejectReview: (id: number, reason: string) =>
    postData<Review>(`/admin/reviews/${id}/reject/`, { reason }),

  deleteReview: (id: number) => deleteData<unknown>(`/admin/reviews/${id}/delete/`),

  // Reports
  report: (kind: "attendance" | "payments" | "students" | "memberships", params?: ListParams) =>
    getPage<AttendanceRecord | PaymentRecord | StudentProfile | MembershipRecord>(
      `/reports/${kind}/`,
      params,
    ),

  dailySummaryReport: () => getData<Record<string, unknown>>("/reports/daily-summary/"),

  seatReport: () => getData<SeatReport>("/reports/seats/"),

  exportReport: (kind: string, format = "csv") =>
    downloadFile(`/reports/export/${kind}/`, `${kind}.${format}`, { format }),

  // Super Admin
  admins: () => getData<AdminUser[]>("/superadmin/admins"),

  addAdmin: (payload: Partial<AdminUser> & { password: string }) =>
    postData<AdminUser>("/superadmin/admins", payload),

  updateAdmin: (id: number, payload: Partial<AdminUser> & { password?: string }) =>
    putData<AdminUser>(`/superadmin/admins/${id}`, payload),

  removeAdmin: (id: number) => deleteData<unknown>(`/superadmin/admins/${id}/remove`),

  deactivateAdmin: (id: number) =>
    postData<AdminUser>(`/superadmin/admins/${id}/deactivate`),

  permissionGroups: () =>
    getData<Array<{ key: string; label: string }>>("/superadmin/permissions"),

  assignPermissions: (admin_id: number, permissions: Record<string, unknown>) =>
    postData<AdminUser>("/superadmin/permissions/assign", { admin_id, permissions }),

  createBackup: () =>
    postData<{ id: string; status: string }>("/superadmin/backup/create/"),

  backups: () =>
    getData<Array<{ id: string; created_at: string; status: string }>>("/superadmin/backup/list/"),

  restoreBackup: (id: string) => postData<unknown>("/superadmin/backup/restore/", { id }),

  superActivityLog: () => getData<ActivityLogItem[]>("/superadmin/activity-log/"),

  systemHealth: () =>
    getData<Record<string, unknown>>("/superadmin/health/"),

  // ─── Sliders ─────────────────────────────────────────────────────────────────

  sliders: () => getData<HomeSlider[]>("/admin/sliders/"),

  createSlider: async (form: FormData) =>
    unwrap<HomeSlider>(
      await api.post<ApiResponse<HomeSlider>>("/admin/sliders/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),

  updateSlider: async (id: number, form: FormData) =>
    unwrap<HomeSlider>(
      await api.put<ApiResponse<HomeSlider>>(`/admin/sliders/${id}/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ),

  deleteSlider: async (id: number) => {
    await api.delete(`/admin/sliders/${id}/`);
  },
  
  studyLeaderboard: (duration?: string, start_date?: string, end_date?: string) => getData<Array<{ rank: number; student: StudentProfile; total_minutes: number; hours_formatted: string; level_info?: {level: number; title: string; badge_color: string}; is_current_user?: boolean }>>("/study/leaderboard/", { duration, start_date, end_date }),
};
