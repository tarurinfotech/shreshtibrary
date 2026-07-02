export type Role = "admin" | "super_admin";

export type ApiResponse<T> = {
  success?: boolean;
  status?: "success" | "error";
  message?: string;
  data?: T;
  errors?: Record<string, string[] | string> | string[] | string;
};

export type PaginatedResponse<T> = {
  success?: boolean;
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  data: T[];
};

export type ListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  [key: string]: string | number | boolean | undefined;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  role: Role;
  permissions: Record<string, unknown>;
  profile_image?: string | null;
  is_active: boolean;
  date_joined?: string;
  last_login?: string | null;
};

export type LoginResponse = {
  tokens: AuthTokens;
  user: AuthUser;
};

export type DashboardStats = {
  students?: {
    total: number;
    live: number;
    pending: number;
    expired: number;
    suspended: number;
    girls?: number;
    boys?: number;
    other?: number;
    new_this_month?: number;
  };
  attendance?: {
    today_present: number;
    today_pending?: number;
    today_absent: number;
    today_total: number;
    today_percentage: number;
  };
  payments?: {
    today_amount: string;
    today_count: number;
    month_amount: string;
    month_count: number;
    pending_count?: number;
  };
  memberships?: {
    active: number;
    expiring_in_7_days: number;
    expired_today: number;
  };
  seats?: {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
  };
  notifications?: {
    sent_today: number;
    unread_count: number;
  };
  total_registered_students?: number;
  active_memberships?: number;
  today_attendance_count?: number;
  total_seats?: number;
  occupied_seats?: number;
  available_seats?: number;
};

export type DashboardChart = {
  labels?: string[];
  present?: number[];
  revenue?: number[];
  total_students?: number;
  payment_count?: number[];
  items?: Array<Record<string, string | number | null>>;
};

export type StudentStatus = "LIVE" | "EXPIRED" | "SUSPENDED" | "PENDING";

export type StudentProfile = {
  id: number;
  user_id: number;
  student_id: string | null;
  username: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  email: string;
  mobile: string;
  is_active: boolean;
  goal: string;
  dob: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  caste?: string | null;
  address: string | null;
  profile_photo?: string | null;
  profile_image?: string | null;
  parent_mobile: string | null;
  status: StudentStatus;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  preferred_language?: string;
  referral_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  joining_date?: string | null;
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  attendance_status?: string;
};

export type StudentTimelineItem = {
  id: number;
  action: string;
  description: string;
  created_at: string;
};

export type StudentAnalytics = {
  period: "weekly" | "monthly" | "yearly";
  attendance: Array<{
    label: string;
    present: number;
    absent: number;
    total: number;
  }>;
  study: Array<{
    label: string;
    hours: number;
    target_hours: number;
  }>;
};

export type PaymentStatus = "PENDING" | "VERIFIED" | "REFUNDED" | "FAILED" | string;

export type PaymentRecord = {
  id: number;
  payment_id?: string | null;
  student: number;
  student_name: string;
  student_profile_photo?: string | null;
  membership?: number | null;
  plan_name?: string | null;
  plan_start?: string | null;
  plan_end?: string | null;
  amount: string;
  status: PaymentStatus;
  method?: string | null;
  payment_mode: string;
  payment_date: string;
  paid_at?: string | null;
  verified_at?: string | null;
  transaction_ref?: string | null;
  transaction_id: string | null;
  receipt_url?: string | null;
  refund_amount?: string | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
  notes?: string | null;
};

export type SeatStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "INACTIVE" | string;

export type Seat = {
  id: number;
  floor: string;
  row: string;
  row_ref?: number | null;
  seat_number: string;
  status: SeatStatus;
  student?: number | null;
  student_name?: string | null;
  student_code?: string | null;
  student_profile_image?: string | null;
  student_profile_photo?: string | null;
  assigned_at?: string | null;
  notes?: string | null;
  is_reserved_for_girls?: boolean;
};

export type SeatRow = {
  id: number;
  floor: number;
  label: string;
  order: number;
  seats: Seat[];
};

export type Floor = {
  id: number;
  name: string;
  description?: string | null;
  order: number;
  is_active: boolean;
  rows: SeatRow[];
};

export type SeatHistoryItem = {
  id: number;
  seat: number;
  student: number | null;
  student_name: string | null;
  assigned_date: string;
  released_date: string | null;
};

export type MembershipPlan = {
  id: number;
  name: string;
  duration_months: number;
  duration_days: number;
  price: string;
  benefits: string[];
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MembershipRecord = {
  id: number;
  student: number;
  student_name: string;
  plan: number | null;
  plan_name: string;
  plan_name_snapshot: string;
  price_snapshot: string;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED" | string;
  is_active: boolean;
  renewal_count: number;
  notes?: string | null;
  created_at?: string | null;
};

export type AttendanceRecord = {
  id: number;
  student: number;
  student_name: string;
  date: string;
  time_in: string | null;
  is_present: boolean;
  is_manual: boolean;
  method: string;
  marked_at?: string | null;
  note?: string | null;
};

export type HolidayRecord = {
  id: number;
  date: string;
  title: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QRCodeRecord = {
  id: number;
  token?: string | null;
  code: string;
  qr_hash?: string;
  valid_date: string;
  is_active?: boolean;
  is_expired: boolean;
  generation_method?: string;
  expiry_timestamp: string;
  expires_at?: string | null;
  created_at?: string | null;
};

export type NotificationRecord = {
  id: number;
  title: string;
  body: string;
  type: string;
  target: string;
  target_group: string;
  goal_filter?: string | null;
  status_filter?: string | null;
  send_push: boolean;
  send_email: boolean;
  send_sms: boolean;
  scheduled_at?: string | null;
  sent_at?: string | null;
  total_recipients: number;
  success_count: number;
  failure_count: number;
  created_at?: string | null;
};

export type AdminInboxNotificationRecord = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_id?: string | null;
  student_id?: number | null;
  student_name?: string | null;
  student_avatar?: string | null;
  created_at: string;
};

export type NotificationRecipient = {
  id: number;
  student: number;
  student_name: string;
  is_read: boolean;
  push_delivered: boolean;
  email_delivered: boolean;
  sms_delivered: boolean;
  delivered_at?: string | null;
  read_at?: string | null;
};

export type Review = {
  id: number;
  student?: number | null;
  student_name: string;
  rating: number;
  comment: string;
  text?: string;
  created_at: string;
  updated_at?: string | null;
  is_approved?: boolean;
  rejection_reason?: string | null;
};

export type LibraryInfo = {
  id?: number;
  name?: string;
  tagline?: string | null;
  description?: string | null;
  feature_image?: string | null;
  logo_square?: string | null;
  logo_rectangle?: string | null;
  rules: string;
  facilities: string;
  about: string;
  address?: string | null;
  phone_primary?: string | null;
  phone_secondary?: string | null;
  email?: string | null;
  website?: string | null;
  open_time?: string | null;
  close_time?: string | null;
  off_days?: string[];
  google_maps_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  updated_at?: string | null;
};

export type Facility = {
  id: number;
  name: string;
  icon_key: string;
  image?: string | null;
  description?: string | null;
  is_active: boolean;
  order: number;
};

export type Achiever = {
  id: number;
  name: string;
  photo: string | null;
  goal?: string | null;
  achievement: string;
  year: number;
  is_featured?: boolean;
  is_active?: boolean;
  order?: number;
  created_at?: string | null;
};

export type AdminUser = AuthUser;

export type AdminProfile = AdminUser & {
  activity_count?: number;
  created_admins_count?: number;
  verified_payments_count?: number;
  marked_attendance_count?: number;
};

export type SeatReport = Array<{
  floor: string;
  total: number;
  occupied: number;
  available: number;
  reserved: number;
}>;

export type ActivityLogItem = {
  id: number;
  admin_name: string;
  action: string;
  description: string;
  target_model: string;
  target_id: number | null;
  created_at: string;
};

export type AlertItem = {
  type: string;
  label: string;
  count: number;
};

export type HomeSlider = {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};


