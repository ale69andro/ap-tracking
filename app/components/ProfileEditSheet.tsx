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
  sex:                 "male" | "female";
  weight:              string;
  height:              string;
  experience:          "beginner" | "intermediate" | "advanced";
  goal:                "hypertrophy" | "strength" | "recomp";
  trainingDaysPerWeek: number;
  sleepQuality:        "low" | "medium" | "high";
};

function profileToForm(p: UserProfile): FormState {
  return {
    sex:                 p.sex,
    weight:              String(p.weight),
    height:              String(p.height),
    experience:          p.experience,
    goal:                p.goal,
    trainingDaysPerWeek: p.trainingDaysPerWeek,
    sleepQuality:        p.sleepQuality,
  };
}

function isValid(f: FormState): boolean {
  return Number(f.weight) > 0 && Number(f.height) > 0;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

type Props = {
  profile: UserProfile;
  onSave:    (profile: UserProfile) => Promise<void>;
  onSignOut: () => void;
  onClose:   () => void;
};

export default function ProfileEditSheet({ profile, onSave, onSignOut, onClose }: Props) {
  const [form, setForm]     = useState<FormState>(() => profileToForm(profile));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!isValid(form) || saving) return;
    setSaving(true);
    try {
      await onSave({
        sex:                 form.sex,
        weight:              Number(form.weight),
        height:              Number(form.height),
        experience:          form.experience,
        goal:                form.goal,
        trainingDaysPerWeek: form.trainingDaysPerWeek,
        sleepQuality:        form.sleepQuality,
      });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 border-b border-zinc-800 shrink-0 flex items-center justify-between">
          <h2 className="text-base font-black text-white">Profile</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 pt-5 pb-8 space-y-7">

          {/* ── Body ───────────────────────────────────────────────────── */}
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
                    value={form.weight}
                    onChange={(e) => set("weight", e.target.value)}
                    className="w-full bg-zinc-800/80 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                </div>
                <div className="flex-1">
                  <FieldLabel>Height (cm)</FieldLabel>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.height}
                    onChange={(e) => set("height", e.target.value)}
                    className="w-full bg-zinc-800/80 text-white rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-red-500/50"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Training ───────────────────────────────────────────────── */}
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

          {/* ── Recovery ───────────────────────────────────────────────── */}
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

          {/* ── Save ───────────────────────────────────────────────────── */}
          <button
            onClick={handleSave}
            disabled={!isValid(form) || saving}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm tracking-widest uppercase transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <div className="border-t border-zinc-800" />

          {/* ── Actions ────────────────────────────────────────────────── */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Actions</p>
            <button
              onClick={onSignOut}
              className="w-full py-3 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 text-red-500 hover:text-red-400 font-bold text-sm transition-colors"
            >
              Sign out
            </button>
          </section>

        </div>
      </div>
    </div>
  );
}
