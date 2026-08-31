"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setErr("Неверный email или пароль");
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
          Войди, чтобы продолжить
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
            placeholder="Пароль"
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
            {busy ? "Входим…" : "Войти"}
          </button>
        </form>
        <div className="text-sm mt-5 text-center" style={{ color: "var(--muted)" }}>
          Нет аккаунта? <Link href="/register" className="underline">Зарегистрируйся</Link>
        </div>
      </div>
    </main>
  );
}
