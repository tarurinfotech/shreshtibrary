import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://shreshtlibrary.onrender.com/api/v1";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refresh = cookieStore.get("shresht_refresh_token")?.value;

    if (!refresh) {
      return NextResponse.json(
        { success: false, message: "No refresh token found." },
        { status: 401 }
      );
    }

    // Call the Django backend to refresh the token
    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    const data = await res.json();

    if (!res.ok) {
      // If refresh failed, clear the cookie
      cookieStore.delete("shresht_refresh_token");
      return NextResponse.json(data, { status: res.status });
    }

    // Optionally set a new refresh token if Django rotates it
    const payload = data.data || data;
    if (payload?.refresh) {
      cookieStore.set({
        name: "shresht_refresh_token",
        value: payload.refresh,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
      delete payload.refresh;
    }

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error during token refresh." },
      { status: 500 }
    );
  }
}
