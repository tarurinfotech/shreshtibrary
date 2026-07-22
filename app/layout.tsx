import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AppProviders } from "./providers";

export async function generateMetadata(): Promise<Metadata> {
  let logoUrl = "/favicon.ico";
  let libraryName = "Shresht Library Admin";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://shreshtlibrary.onrender.com";
    const res = await fetch(`${baseUrl}/api/v1/library/info`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const result = await res.json();
      if (result?.data?.logo) {
        const path = result.data.logo;
        logoUrl = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
      }
      if (result?.data?.library_name) {
        libraryName = `${result.data.library_name} Admin`;
      }
    }
  } catch (error) {
    // Fallback to defaults
  }

  return {
    title: libraryName,
    description: `Admin dashboard for ${libraryName}`,
    icons: {
      icon: logoUrl,
    },
  };
}

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
