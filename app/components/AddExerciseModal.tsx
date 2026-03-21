"use client";

import { useState } from "react";
import { LIBRARY, MUSCLE_GROUP_CATEGORIES } from "@/app/constants/exercises";
import type { LibraryExercise } from "@/app/types";

type Props = {
  userExercises: LibraryExercise[];
  onAdd: (name: string, muscleGroups: string[]) => void;
  onCreateCustom: (name: string, muscleGroups: string[]) => Promise<void>;
  onClose: () => void;
};

export default function AddExerciseModal({ userExercises, onAdd, onCreateCustom, onClose }: Props) {
  const [tab, setTab] = useState<"library" | "custom">("library");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Merge built-in + user exercises. Built-in names win on case-insensitive collision.
  const mergedLibrary = (() => {
    const builtInNames = new Set(LIBRARY.map((e) => e.name.toLowerCase()));
    const customOnly = userExercises.filter((e) => !builtInNames.has(e.name.toLowerCase()));
    return [...LIBRARY, ...customOnly];
  })();

  const visibleExercises = (() => {
    let list = mergedLibrary;
    if (activeCategory !== "All") {
      const cat = MUSCLE_GROUP_CATEGORIES.find((c) => c.label === activeCategory);
      if (cat) list = list.filter((ex) => ex.muscleGroups.length === 0 || ex.muscleGroups.some((m) => cat.muscles.includes(m)));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return list;
  })();

  const toggleMuscle = (muscle: string) =>
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );

  const handleAddCustom = async () => {
    console.log("🔥 CUSTOM BUTTON CLICKED");
    const name = customName.trim();
    if (!name || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onCreateCustom(name, selectedMuscles);
      // On success page.tsx closes the modal and adds the exercise to the workout.
    } catch (e) {
      console.error("createUserExercise failed:", e);
      const msg = e instanceof Error && e.message === "DUPLICATE_EXERCISE"
        ? "An exercise with this name already exists."
        : "Could not save exercise. Please try again.";
      setSaveError(msg);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <h2 className="font-bold text-white text-lg">Add Exercise</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors">✕</button>
        </div>

        <div className="flex border-b border-zinc-800">
          {(["library", "custom"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? "text-red-500 border-b-2 border-red-500" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "library" ? "Library" : "Custom"}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "library" ? (
            <div className="space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exercises…"
                className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {!search.trim() && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {["All", ...MUSCLE_GROUP_CATEGORIES.map((c) => c.label)].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                        activeCategory === cat
                          ? "bg-red-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <div className="max-h-80 overflow-y-auto -mx-1 px-1">
                  {visibleExercises.map((ex) => (
                    <button
                      key={ex.name}
                      onClick={() => onAdd(ex.name, ex.muscleGroups)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-zinc-100">{ex.name}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{ex.muscleGroups.join(" · ")}</p>
                      </div>
                      <span className="text-zinc-700 font-black text-base ml-3 shrink-0">+</span>
                    </button>
                  ))}
                </div>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 font-medium mb-2">Exercise name</label>
                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Bench Press Variation" autoFocus
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 font-medium mb-2">
                  Muscle groups
                  {selectedMuscles.length > 0 && <span className="ml-2 text-red-500 font-semibold">{selectedMuscles.length} selected</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUP_CATEGORIES.map(({ label }) => (
                    <button key={label} type="button" onClick={() => toggleMuscle(label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedMuscles.includes(label) ? "bg-red-600 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {saveError && (
                <p className="text-xs text-red-400 font-medium">{saveError}</p>
              )}
              <button
                onClick={handleAddCustom}
                disabled={!customName.trim() || saving}
                className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm transition-colors"
              >
                {saving ? "Saving…" : "Add Exercise"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
