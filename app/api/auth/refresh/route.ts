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

    let baseUrl = API_BASE_URL;
    if (!baseUrl || baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
      baseUrl = "https://shreshtlibrary.onrender.com/api/v1";
    }

    const targetUrl = `${baseUrl.replace(/\/$/, "")}/auth/token/refresh`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });

    const responseText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: false, message: responseText || "Server returned non-JSON response." };
    }

    if (!res.ok) {
      cookieStore.delete("shresht_refresh_token");
      return NextResponse.json(
        typeof data === "object" && data !== null ? data : { success: false, message: "Token refresh failed." },
        { status: res.status }
      );
    }

    const accessToken = data.access ?? data.data?.access;

    if (!accessToken) {
      cookieStore.delete("shresht_refresh_token");
      return NextResponse.json(
        { success: false, message: "No access token in refresh response." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, data: { access: accessToken } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: "Failed to connect to backend auth service.", error: error?.message || String(error) },
      { status: 502 }
    );
  }
}
