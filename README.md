<<<<<<< HEAD
# Shresht Library - Digital Library Management System

This is the backend API service for Shresht Library. It provides full integration for student check-ins, memberships management, seat layouts, payments tracking, notifications dispatching, and analytical reporting.

## Folder Structure

The project has been refactored into modular components:

- `apps/` - Feature modules (e.g. accounts, students, attendance, memberships, payments, seats, notifications, library, study)
- `core/` - Global logging and settings
- `api/v1/` - URL routing, serializing, and views divided by component namespaces
- `utils/` - Global response standardizations, paginators, FCM interfaces, QR helpers, and exporters
- `shreshtlibrary/settings/` - Environment-based settings configurations (base, development, staging, production)

## Quick Start

1. Create a python virtual environment and install requirements:
   ```bash
   pip install -r requirements.txt
   ```

2. Run database migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. Start development server:
   ```bash
   python manage.py runserver
   ```
DJANGO_ENV=development
SECRET_KEY=django-insecure-ing&tc-&$3+-0bw!f0!n2$-vbl63#40i#@^&rbn)gaohd4(c@d

# Supabase Auth Configuration
NEXT_PUBLIC_SUPABASE_URL=https://crrfhaaqeainuqzkmged.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_m0z-t34QvHCIjmiFc9n4mQ_yy6epwbt

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmZoYWFxZWFpbnVxemttZ2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzE4NTksImV4cCI6MjA5NjUwNzg1OX0.2_Sykl4JfF7T5W0Z7pK-2rueLArwvlwGk4eMce1BxwI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycmZoYWFxZWFpbnVxemttZ2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkzMTg1OSwiZXhwIjoyMDk2NTA3ODU5fQ.YsKtFhHCUKdLN6HkvBg9qB5GvGlFw2RTFtd1vFPZ_sc--

# Copy your JWT Secret from: Settings -> API -> JWT Settings -> JWT Secret
SUPABASE_JWT_SECRET=your_jwt_secret_from_supabase_dashboard

# PostgreSQL Connection String (Replace [YOUR-DATABASE-PASSWORD] with your actual Supabase DB Password)
DATABASE_URL=postgresql://postgres:shreshtlibrary@db.crrfhaaqeainuqzkmged.supabase.co:5432/postgres
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> f4e4ccdb49f060374c6744d4ef90f19790d2471f
