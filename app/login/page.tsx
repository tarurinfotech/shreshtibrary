"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";;
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useToastStore } from "@/store/toastStore";

export default function LoginPage() {
  const router = useRouter();
  const { access, hydrated, setSession, user } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const pushToast = useToastStore((state) => state.pushToast);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isRefreshingSession = hydrated && user && !access;

  useEffect(() => {
    if (hydrated && access) {
      router.replace("/dashboard");
    }
  }, [access, hydrated, router]);

  const login = useMutation({
    mutationFn: () => endpoints.login({ username, password }),
    onSuccess: (data) => {
      setSession(data.tokens.access, data.user);
      pushToast({ kind: "success", title: "Signed in", message: `Welcome, ${data.user.username}` });
      router.replace("/dashboard");
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Login failed", message: getErrorMessage(error) });
    },
  });

  if (!hydrated || isRefreshingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-transparent p-6">
        <LoadingBlock label="Checking session" />
      </main>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    login.mutate();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-6 py-10">
      <div className="fixed right-4 top-4">
        <Button
          variant="secondary"
          size="sm"
          icon={theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          onClick={toggleTheme}
          type="button"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </Button>
      </div>
      <section className="w-full max-w-md">
        <div className="mb-8">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-[color:var(--primary-contrast)] shadow-[var(--shadow-soft)]">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-normal">Shresht Library Admin</h1>
          <p className="mt-2 text-sm text-muted">Secure staff access</p>
        </div>

        <FormShell surface onSubmit={submit}>
          <Input
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={fieldErrors.username}
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
            required
          />
          <Button type="submit" loading={login.isPending} icon={<LogIn className="h-4 w-4" />}>
            Sign in
          </Button>
        </FormShell>
      </section>
    </main>
  );
}
