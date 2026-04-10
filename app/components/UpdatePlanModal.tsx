"use client";

type Props = {
  loading?: boolean;
  error?: string;
  onUpdatePlan: () => void;
  onKeepPlan: () => void;
  onCancel: () => void;
};

export default function UpdatePlanModal({
  loading = false,
  error,
  onUpdatePlan,
  onKeepPlan,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-t-3xl px-6 pt-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-white mb-2">Update your workout plan?</h2>
        <p className="text-sm text-zinc-500 mb-6">
          You changed the exercise structure during this workout. Do you want to update your saved plan with these changes?
        </p>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <div className="space-y-3">
          <button
            onClick={onUpdatePlan}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 disabled:pointer-events-none text-white font-black text-sm tracking-widest uppercase transition-colors"
          >
            {loading ? "Saving..." : "Update Plan"}
          </button>
          <button
            onClick={onKeepPlan}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none text-zinc-300 font-bold text-sm transition-colors"
          >
            Keep Plan
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-transparent hover:bg-zinc-900 disabled:opacity-40 disabled:pointer-events-none text-zinc-500 font-bold text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
