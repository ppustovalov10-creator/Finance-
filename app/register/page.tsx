"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setErr(data.error || "Не удалось создать аккаунт");
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (signInRes?.error) {
      setErr("Аккаунт создан, но не удалось войти автоматически — попробуй войти вручную");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-[380px]">
        <div className="font-display font-bold text-2xl mb-1">Бюджет</div>
        <div className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          Трекер для тех, чей доход зависит от продаж
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "#fff", color: "var(--sheet-ink)", border: "1px solid var(--sheet-line)" }}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Пароль (минимум 8 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "#fff", color: "var(--sheet-ink)", border: "1px solid var(--sheet-line)" }}
          />
          {err && (
            <div className="text-sm" style={{ color: "var(--danger)" }}>
              {err}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl font-bold text-sm mt-1"
            style={{ background: "var(--ink)", color: "var(--bg)" }}
          >
            {busy ? "Создаём…" : "Создать аккаунт"}
          </button>
        </form>
        <div className="text-sm mt-5 text-center" style={{ color: "var(--muted)" }}>
          Уже есть аккаунт? <Link href="/login" className="underline">Войти</Link>
        </div>
      </div>
    </main>
  );
}
