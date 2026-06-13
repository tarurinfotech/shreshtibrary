# Full Next.js UI & API Architecture Guide

This document serves as a comprehensive guide for recreating the frontend UI, including its components, screens, and API integrations. An author agent can use this reference to build all features to match the exact aesthetics, functionality, and data flow of this specific Next.js admin dashboard.

## 1. Application Overview & Stack
- **Framework**: Next.js (App Router `app/`)
- **Styling**: Tailwind CSS (`globals.css`) with standard UI tokens (e.g., `bg-panel`, `text-muted`, `bg-border`).
- **Icons**: `lucide-react`
- **Data Fetching / State Management**: `@tanstack/react-query` for API caching, React Query mutations for forms. Global state (like Auth and Theme) handled via Zustand (`store/authStore.ts`, `store/themeStore.ts`).
- **Charts**: `recharts` for dashboard analytics.

## 2. Global UI Layout & Appbar (Topbar)
The layout relies on a persistent shell wrapper that includes the sidebar navigation and a sticky top Appbar.

### Appbar (`components/layout/Topbar.tsx`)
- **Behavior**: Sticky at the top (`sticky top-0 z-50 h-24`), styled with a blur effect (`backdrop-blur bg-background/90`).
- **Elements**:
  - **Left**: Mobile menu toggle (`Menu` icon) and a global search component (`<GlobalSearch />`).
  - **Right**:
    - **Refresh**: Reloads the current state (`RefreshCw` icon).
    - **Theme Toggle**: Switches between dark/light themes (`Sun`/`Moon` icons), updating via `useThemeStore`.
    - **Notifications/Inbox**: Bell icon indicating unread admin inbox messages (`alerts.data` and `inbox.data` fetched via polling, interval: 30-60s).
    - **Profile Snippet**: Displays user's avatar, name, and role (`<ProfileAvatar />`).
    - **Logout**: Clears session via `clearSession()` and redirects to `/login`.
- **API Calls in Appbar**:
  - `endpoints.dashboardAlerts` (React Query key `["dashboard-alerts-topbar"]`)
  - `endpoints.adminInbox` (React Query key `["admin-inbox-topbar"]`)

## 3. Screens Architecture (The `/app/dashboard/*` Routes)
The admin panel contains multiple functional modules, each having its own directory under `app/dashboard/`.

### Common Screen Anatomy
Every screen strictly adheres to a standard aesthetic:
1. **`<PageHeader />`**: Contains the page title, eyebrow text (subtitle), and primary actions (e.g., "Add Slider" button).
2. **Loading/Error States**: Graceful fallback states using `<LoadingBlock />` and `<ErrorState />` components.
3. **Data Display**: Information is generally displayed using custom `<ChartCard />`, `<StatCard />`, or tabular `<Table />` components.
4. **Modals & Dialogs**: Add/Edit operations happen inside `<Modal />` components rather than new pages. Deletions use `<ConfirmDialog />`.

### Highlight: Sliders Management Screen (`app/dashboard/sliders/page.tsx`)
- **Purpose**: Manage dynamic banner sliders for a mobile or client app.
- **UI Elements**:
  - **Header**: Shows "Home Sliders" with an "Add Slider" action button.
  - **Grid Layout**: Displays sliders in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
  - **Slider Card**: Shows a 21:9 ratio image preview. If no image is provided, shows a fallback icon. Overlaid with an "Order" badge. Contains "Edit" and "Delete" actions.
  - **Inactive Section**: Sliders that are turned off are grouped under an "Inactive Sliders" section with lowered opacity (`opacity-60`).
- **Forms (Inside Modal)**:
  - Takes Image File (`input type="file"`), Title, Subtitle, Link URL, Sort Order, and an Active Toggle switch.
  - Uses `FormData` to handle the multipart request (image upload).
- **API Integration**:
  - Fetch: `endpoints.sliders`
  - Create: `endpoints.createSlider(formData)`
  - Update: `endpoints.updateSlider(id, formData)`
  - Delete: `endpoints.deleteSliderDELETE(id)`
  - State management handles invalidating queries (`queryClient.invalidateQueries({ queryKey: ["sliders"] })`) upon mutation success.

### Highlight: Main Dashboard Screen (`app/dashboard/page.tsx`)
- **Purpose**: Provide a bird's-eye view of analytics, stats, and recent activity.
- **UI Elements**:
  - **Quick Stats**: Shows total students, live members, revenue, and seats availability using `tone` colors (`violet`, `blue`, `amber`, `green`).
  - **Main Chart**: A customized `AreaChart` with gradient fills, showing dynamically swappable domains (attendance, revenue, students, etc.).
  - **Analytics Donut Chart**: Visualizes "Live", "Expired", and "Suspended" student distributions using `PieChart`. Also contains gender distribution progress bars.
  - **Recent Activity Feed**: A custom vertical timeline showing actions taken by admins.
- **API Integration**:
  - Fetch Stats: `endpoints.dashboardStats`
  - Fetch Chart Data: `endpoints.dashboardChart(domain)`
  - Fetch Recent Activity: `endpoints.dashboardActivityRecent`

## 4. Comprehensive API Integrations (`lib/endpoints.ts`)
The entire application utilizes a centralized endpoint manager (`endpoints.ts`). 
- **Methodology**: It uses a custom `api` Axios wrapper with generic wrappers like `getData<T>`, `postData<T>`, `postMultipart<T>` for consistent type safety.
- **Endpoints Covering**:
  - **Auth**: `/auth/login/admin/`, `/auth/me/`
  - **Students**: CRUD operations, Timeline, Attendance, Analytics, Exports.
  - **Memberships & Plans**: Assigning, renewing, upgrading plans, expiring today metrics.
  - **Seats**: Seat grids, floor layouts, assigning and unassigning study seats.
  - **QR & Attendance**: Manual and QR-based attendance, history, streaks.
  - **Payments**: Verification, refunds, and receipts.
  - **Library Assets**: Informational content, reviews, achievers, facilities.
  - **Notifications & Inbox**: Target-based bulk notifications.
  - **Superadmin**: Staff permissions, health, and backups.

## 5. Instructions for the "Author Agent"

If you are tasked with creating new UI components or a completely new screen that matches this exact application, follow these strict rules:

1. **Imports**: ALWAYS use the provided custom UI components located in `components/ui/` (e.g., `import { Button } from "@/components/ui/Button";`). DO NOT use raw HTML elements for buttons, inputs, modals, or tables.
2. **Page Skeleton**: 
   - Start the page with `<PageHeader title="..." eyebrow="..." actions={<Button>...</Button>} />`.
   - Wrap the main content in standard layouts using CSS Grid (`className="grid gap-6"`).
3. **Fetching Data**:
   - Always use `@tanstack/react-query`'s `useQuery`. 
   - Reference the endpoint from `lib/endpoints.ts`. 
   - Example: `const { data, isLoading } = useQuery({ queryKey: ["my-key"], queryFn: endpoints.myFunction });`
4. **Mutations (Forms & Deletions)**:
   - Use `useMutation`.
   - Manage toast notifications on success/error via `useToastStore`.
   - Invalidate the relevant query keys on `onSuccess`.
   - Handle file uploads exactly like the Slider modal—by appending values to `FormData` and calling a multipart endpoint.
5. **Design Details**:
   - Use `className="bg-panel rounded-xl border border-border shadow-sm"` for generic cards or containers.
   - For icons, use `lucide-react`. Ensure standard sizing (`h-5 w-5` or `h-4 w-4`) and matching stroke widths.
   - Dark mode is built-in; always use semantic Tailwind colors (e.g., `text-foreground`, `text-muted`, `bg-panel-strong`) instead of hardcoded grays or blacks to ensure theme compatibility.
