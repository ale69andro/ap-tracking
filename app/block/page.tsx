"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useTrainingBlock } from "@/app/hooks/useTrainingBlock";
import BlockScreen from "@/app/components/block/BlockScreen";

export default function BlockPage() {
  const { user, loading: authLoading } = useAuth();
  const state = useTrainingBlock(user?.id ?? null);
  const router = useRouter();

  // Back returns to the tab the user came from; direct visits fall back to the dashboard.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-32 max-w-xl mx-auto">
      <header className="mb-8">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 -ml-1 py-3 pr-4 text-sm font-bold text-zinc-400 active:text-zinc-200"
        >
          <ChevronLeft size={16} /> Zurück
        </button>
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mt-2 mb-2">AP-Tracking</p>
        <h1 className="text-4xl font-black text-white tracking-tight leading-none">Block</h1>
      </header>

      {authLoading ? (
        <p className="py-24 text-center text-sm text-zinc-500">Lädt…</p>
      ) : (
        <BlockScreen state={state} />
      )}
    </main>
  );
}
