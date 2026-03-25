"use client";

import { useState, useEffect } from "react";
import type { UserProfile } from "@/app/types";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import ProfileProgressionSection from "./ProfileProgressionSection";

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

function SectionRow({ label, summary, onClick }: { label: string; summary: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-800/60 rounded-xl hover:bg-zinc-800 transition-colors"
    >
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-zinc-500 truncate max-w-[160px]">{summary}</span>
        <ChevronRight size={14} className="text-zinc-600 shrink-0" />
      </span>
    </button>
  );
}

// ─── Summary formatters ───────────────────────────────────────────────────────

function trainingprofilSum(f: FormState): string {
  const w = f.weight ? `${f.weight} kg` : "—";
  const goal = f.goal.charAt(0).toUpperCase() + f.goal.slice(1);
  return `${w} · ${goal} · ${f.trainingDaysPerWeek}×/wk`;
}

function einstellungenSum(f: FormState): string {
  const parts = [f.keepScreenOn ? "Screen on" : "Screen off"];
  if (f.restTimerSound) parts.push("Sound on");
  return parts.join(" · ");
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
  keepScreenOn:        boolean;
  restTimerSound:      boolean;
};

type Section = "trainingsprofil" | "einstellungen";

function profileToForm(p: UserProfile): FormState {
  return {
    sex:                 p.sex,
    weight:              String(p.weight),
    height:              String(p.height),
    experience:          p.experience,
    goal:                p.goal,
    trainingDaysPerWeek: p.trainingDaysPerWeek,
    sleepQuality:        p.sleepQuality,
    keepScreenOn:        p.keepScreenOn   ?? true,
    restTimerSound:      p.restTimerSound ?? false,
  };
}

function isValid(f: FormState): boolean {
  return Number(f.weight) > 0 && Number(f.height) > 0;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

type Props = {
  profile: UserProfile;
  onSave:        (profile: UserProfile) => Promise<void>;
  onSignOut:     () => void;
  onClose:       () => void;
  totalXp:       number;
  currentStreak: number;
  longestStreak: number;
};

export default function ProfileEditSheet({ profile, onSave, onSignOut, onClose, totalXp, currentStreak, longestStreak }: Props) {
  const [form, setForm]             = useState<FormState>(() => profileToForm(profile));
  const [saving, setSaving]         = useState(false);
  const [activeSection, setSection] = useState<Section | null>(null);

  // Keep form in sync when the loaded profile changes (e.g. after initial fetch)
  useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile]);

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
        keepScreenOn:        form.keepScreenOn,
        restTimerSound:      form.restTimerSound,
      });
      onClose();
    } catch {
      setSaving(false);
    }
  };

  // ── Section detail fields ──────────────────────────────────────────────────

  const sectionTitle: Record<Section, string> = {
    trainingsprofil: "Training",
    einstellungen:   "Settings",
  };

  function SectionFields() {
    switch (activeSection) {
      case "trainingsprofil":
        return (
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
            <div>
              <FieldLabel>Average sleep quality</FieldLabel>
              <div className="flex gap-2">
                <Chip label="Poor"    active={form.sleepQuality === "low"}    onClick={() => set("sleepQuality", "low")}    />
                <Chip label="Average" active={form.sleepQuality === "medium"} onClick={() => set("sleepQuality", "medium")} />
                <Chip label="Good"    active={form.sleepQuality === "high"}   onClick={() => set("sleepQuality", "high")}   />
              </div>
            </div>
          </div>
        );

      case "einstellungen":
        return (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => set("keepScreenOn", !form.keepScreenOn)}
              className="w-full flex items-center justify-between bg-zinc-800/80 rounded-xl px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Keep screen on during workout</p>
                <p className="text-xs text-zinc-500 mt-0.5">Prevents your screen from turning off during workouts</p>
              </div>
              <div className={`ml-4 shrink-0 w-11 h-6 rounded-full transition-colors ${form.keepScreenOn ? "bg-red-600" : "bg-zinc-700"}`}>
                <div className={`mt-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.keepScreenOn ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </div>
            </button>
            <button
              type="button"
              onClick={() => set("restTimerSound", !form.restTimerSound)}
              className="w-full flex items-center justify-between bg-zinc-800/80 rounded-xl px-4 py-3"
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-white">Rest-Timer Sound</p>
                <p className="text-xs text-zinc-500 mt-0.5">Plays a soft chime when rest time is up</p>
              </div>
              <div className={`ml-4 shrink-0 w-11 h-6 rounded-full transition-colors ${form.restTimerSound ? "bg-red-600" : "bg-zinc-700"}`}>
                <div className={`mt-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.restTimerSound ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </div>
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
          {activeSection !== null ? (
            <button
              onClick={() => setSection(null)}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={16} />
              <span className="text-sm font-semibold">Back</span>
            </button>
          ) : (
            <h2 className="text-base font-black text-white">Profile</h2>
          )}

          <div className="flex items-center gap-2">
            {activeSection !== null && (
              <h2 className="text-base font-black text-white">{sectionTitle[activeSection]}</h2>
            )}
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeSection === null ? (
          /* ── Overview ──────────────────────────────────────────────── */
          <div className="overflow-y-auto px-5 pt-5 pb-8 space-y-2">
            <ProfileProgressionSection
              totalXp={totalXp}
              currentStreak={currentStreak}
              longestStreak={longestStreak}
            />

            <div className="border-t border-zinc-800 my-4" />

            <SectionRow label="Training" summary={trainingprofilSum(form)}  onClick={() => setSection("trainingsprofil")} />
            <SectionRow label="Settings" summary={einstellungenSum(form)}   onClick={() => setSection("einstellungen")}  />

            <div className="pt-5">
              <button
                onClick={handleSave}
                disabled={!isValid(form) || saving}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm tracking-widest uppercase transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="border-t border-zinc-800 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Actions</p>
              <button
                onClick={onSignOut}
                className="w-full py-3 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 text-red-500 hover:text-red-400 font-bold text-sm transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          /* ── Section detail ─────────────────────────────────────────── */
          <div className="overflow-y-auto px-5 pt-5 pb-8">
            <SectionFields />
          </div>
        )}

      </div>
    </div>
  );
}
