import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE_URL } from "@/lib/baseApi";

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

    // ASP.NET Core returns { access: "..." } directly (not wrapped).
    // Normalize into { success: true, data: { access } } so that
    // the frontend api.ts interceptor at response.data.data.access works.
    const accessToken = data.access ?? data.data?.access;

    if (!accessToken) {
      cookieStore.delete("shresht_refresh_token");
      return NextResponse.json(
        { success: false, message: "No access token in refresh response." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, data: { access: accessToken } });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error during token refresh." },
      { status: 500 }
    );
  }
}
