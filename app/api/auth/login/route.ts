import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { API_BASE_URL } from "@/lib/baseApi";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
<<<<<<< HEAD
    const targetUrl = `${API_BASE_URL.replace(/\/$/, "")}/auth/login/admin`;
=======
    let baseUrl = API_BASE_URL;
    if (!baseUrl || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      baseUrl = "https://shreshtlibrary.onrender.com/api/v1";
    }

    let targetUrl = `${baseUrl.replace(/\/$/, "")}/auth/login/admin`;
>>>>>>> ff11e62af0a771cc3104ac934d000cc4cbb1ecca

    let res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.status === 404) {
      targetUrl = `${baseUrl.replace(/\/$/, "")}/auth/login`;
      res = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    }

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: false, message: responseText || "Server returned non-JSON response." };
    }

    if (!res.ok) {
      return NextResponse.json(
        typeof data === "object" && data !== null ? data : { success: false, message: "Login failed." },
        { status: res.status }
      );
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Failed to connect to backend auth service.", error: error?.message || String(error) },
      { status: 502 }
    );
  }
}
