"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, signUp returns a live session — redirect immediately.
    // If confirmation is required, session is null — show the confirmation screen.
    if (data.session) {
      router.refresh();
      router.replace("/");
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
            AP-Tracking
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight mb-4">
            Check your email
          </h1>
          <p className="text-zinc-500 text-sm mb-8">
            We sent a confirmation link to <span className="text-zinc-300">{email}</span>.
            Click it to activate your account.
          </p>
          <Link
            href="/auth/login"
            className="text-zinc-400 hover:text-white text-sm font-semibold transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
          AP-Tracking
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight mb-10">
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm tracking-widest uppercase transition-colors shadow-[0_0_24px_rgba(239,68,68,0.25)] mt-2"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-zinc-400 hover:text-white font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
