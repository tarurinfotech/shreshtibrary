import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "Shresht Library Admin",
  description: "Admin dashboard for Shresht Library",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("shresht-admin-theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en" data-theme={theme} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground" suppressHydrationWarning>
        <AppProviders initialTheme={theme}>{children}</AppProviders>
      </body>
    </html>
  );
}
