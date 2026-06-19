import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE_URL } from "@/lib/baseApi";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Call the Django backend
    const res = await fetch(`${API_BASE_URL}/auth/login/admin/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // data.data should contain tokens and user according to ApiResponse format
    const payload = data.data;

    // Set refresh token in HttpOnly cookie
    if (payload?.tokens?.refresh) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: "shresht_refresh_token",
        value: payload.tokens.refresh,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    // Return everything except the refresh token
    if (payload?.tokens) {
      delete payload.tokens.refresh;
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error during login." },
      { status: 500 }
    );
  }
}
