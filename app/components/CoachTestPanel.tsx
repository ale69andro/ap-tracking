"use client";

/**
 * Coach Testing Mode panel — DEV ONLY.
 *
 * Rendered only when process.env.NODE_ENV === "development".
 * Provides scenario selection, profile override, and reset.
 * All test state lives in the parent (page.tsx); this component is fully controlled.
 */

import type { UserProfile } from "@/app/types";
import { COACH_TEST_SCENARIOS, COACH_TEST_INITIAL } from "@/app/constants/coachTestScenarios";
import type { CoachTestState } from "@/app/constants/coachTestScenarios";
import { useState } from "react";
import { X, FlaskConical } from "lucide-react";

interface Props {
  state: CoachTestState;
  onChange: (next: CoachTestState) => void;
}

export default function CoachTestPanel({ state, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const isActive = state.scenarioId !== null || state.profileOverride !== null;

  const setScenario = (id: string | null) =>
    onChange({ ...state, scenarioId: id });

  const setProfileField = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K] | "",
  ) => {
    if (value === "") {
      const next = { ...state.profileOverride };
      delete next[key];
      onChange({ ...state, profileOverride: Object.keys(next).length ? next : null });
    } else {
      onChange({ ...state, profileOverride: { ...state.profileOverride, [key]: value } });
    }
  };

  const reset = () => {
    onChange(COACH_TEST_INITIAL);
  };

  return (
    <>
      {/* Trigger — small flask icon, bottom-right, above tab bar */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 z-40 w-9 h-9 rounded-full border flex items-center justify-center text-sm transition-colors ${
          isActive
            ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
            : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
        }`}
        title="Coach Test Mode"
      >
        <FlaskConical size={16} />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-32 right-4 z-50 w-72 bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              ● Coach Test Mode
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 flex items-center justify-center px-1 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-4 py-3 space-y-4">
            {/* Scenario selector */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                Scenario
              </label>
              <select
                value={state.scenarioId ?? ""}
                onChange={(e) => setScenario(e.target.value || null)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="">— Real data</option>
                {COACH_TEST_SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Profile override */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                Profile override
              </label>
              <div className="space-y-2">
                <ProfileRow
                  label="Experience"
                  value={state.profileOverride?.experience ?? ""}
                  onChange={(v) => setProfileField("experience", v as UserProfile["experience"] | "")}
                  options={[
                    { value: "beginner",     label: "Beginner"     },
                    { value: "intermediate", label: "Intermediate" },
                    { value: "advanced",     label: "Advanced"     },
                  ]}
                />
                <ProfileRow
                  label="Goal"
                  value={state.profileOverride?.goal ?? ""}
                  onChange={(v) => setProfileField("goal", v as UserProfile["goal"] | "")}
                  options={[
                    { value: "strength",    label: "Strength"    },
                    { value: "hypertrophy", label: "Hypertrophy" },
                    { value: "recomp",      label: "Recomp"      },
                  ]}
                />
                <ProfileRow
                  label="Sleep"
                  value={state.profileOverride?.sleepQuality ?? ""}
                  onChange={(v) => setProfileField("sleepQuality", v as UserProfile["sleepQuality"] | "")}
                  options={[
                    { value: "low",    label: "Low"    },
                    { value: "medium", label: "Medium" },
                    { value: "high",   label: "High"   },
                  ]}
                />
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded-lg py-2 transition-colors"
            >
              Reset to real data
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function ProfileRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-500 w-20 shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
      >
        <option value="">— real</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
