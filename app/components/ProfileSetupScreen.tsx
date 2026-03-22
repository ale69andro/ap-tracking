"use client";

import { useState } from "react";
import type { UserProfile } from "@/app/types";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
        active
          ? "bg-red-600 text-white"
          : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <p className="text-xs text-zinc-500 mb-2">{children}</p>;
}

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  sex:                 "male" | "female" | "";
  weight:              string;
  height:              string;
  experience:          "beginner" | "intermediate" | "advanced" | "";
  goal:                "hypertrophy" | "strength" | "recomp" | "";
  trainingDaysPerWeek: number;
  sleepQuality:        "low" | "medium" | "high";
};

function toProfile(f: FormState): UserProfile {
  return {
    sex:                 f.sex as "male" | "female",
    weight:              Number(f.weight),
    height:              Number(f.height),
    experience:          f.experience as UserProfile["experience"],
    goal:                f.goal as UserProfile["goal"],
    trainingDaysPerWeek: f.trainingDaysPerWeek,
    sleepQuality:        f.sleepQuality,
  };
}

function isValid(f: FormState): boolean {
  return (
    f.sex !== "" &&
    f.experience !== "" &&
    f.goal !== "" &&
    f.weight !== "" && Number(f.weight) > 0 &&
    f.height !== "" && Number(f.height) > 0
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = { onSave: (profile: UserProfile) => Promise<void> };

export default function ProfileSetupScreen({ onSave }: Props) {
  const [form, setForm] = useState<FormState>({
    sex:                 "",
    weight:              "",
    height:              "",
    experience:          "",
    goal:                "",
    trainingDaysPerWeek: 3,
    sleepQuality:        "medium",
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!isValid(form) || saving) return;
    setSaving(true);
    try {
      await onSave(toProfile(form));
    } catch {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="mb-8">
        <p className="text-red-500 text-[11px] font-bold tracking-widest uppercase mb-2">
          AP-Tracking
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight leading-none">
          Set up profile
        </h1>
        <p className="text-zinc-500 text-sm mt-2">
          Personalizes your training recommendations.
        </p>
      </header>

      <div className="space-y-8">

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Body</p>
          <div className="space-y-4">
            <div>
              <FieldLabel>Sex</FieldLabel>
              <div className="flex gap-2">
                <Chip label="Male"   active={form.sex === "male"}   onClick={() => set("sex", "male")}   />
                <Chip label="Female" active={form.sex === "female"} onClick={() => set("sex", "female")} />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <FieldLabel>Weight (kg)</FieldLabel>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="75"
                  value={form.weight}
                  onChange={(e) => set("weight", e.target.value)}
                  className="w-full bg-zinc-800/80 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-red-500/50 placeholder-zinc-600"
                />
              </div>
              <div className="flex-1">
                <FieldLabel>Height (cm)</FieldLabel>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="175"
                  value={form.height}
                  onChange={(e) => set("height", e.target.value)}
                  className="w-full bg-zinc-800/80 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-red-500/50 placeholder-zinc-600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Training ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Training</p>
          <div className="space-y-4">
            <div>
              <FieldLabel>Experience</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Chip label="Beginner"     active={form.experience === "beginner"}     onClick={() => set("experience", "beginner")}     />
                <Chip label="Intermediate" active={form.experience === "intermediate"} onClick={() => set("experience", "intermediate")} />
                <Chip label="Advanced"     active={form.experience === "advanced"}     onClick={() => set("experience", "advanced")}     />
              </div>
            </div>
            <div>
              <FieldLabel>Primary goal</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Chip label="Hypertrophy" active={form.goal === "hypertrophy"} onClick={() => set("goal", "hypertrophy")} />
                <Chip label="Strength"    active={form.goal === "strength"}    onClick={() => set("goal", "strength")}    />
                <Chip label="Recomp"      active={form.goal === "recomp"}      onClick={() => set("goal", "recomp")}      />
              </div>
            </div>
            <div>
              <FieldLabel>Days per week</FieldLabel>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set("trainingDaysPerWeek", d)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
                      form.trainingDaysPerWeek === d
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Recovery ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Recovery</p>
          <div>
            <FieldLabel>Average sleep quality</FieldLabel>
            <div className="flex gap-2">
              <Chip label="Poor"    active={form.sleepQuality === "low"}    onClick={() => set("sleepQuality", "low")}    />
              <Chip label="Average" active={form.sleepQuality === "medium"} onClick={() => set("sleepQuality", "medium")} />
              <Chip label="Good"    active={form.sleepQuality === "high"}   onClick={() => set("sleepQuality", "high")}   />
            </div>
          </div>
        </section>

      </div>

      <div className="mt-10 pb-2">
        <button
          onClick={handleSubmit}
          disabled={!isValid(form) || saving}
          className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm tracking-widest uppercase transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </>
  );
}
