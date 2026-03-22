"use client";

import { useState } from "react";
import type { WorkoutTemplate, TemplateExercise, LibraryExercise, Equipment } from "@/app/types";
import { LIBRARY, MUSCLE_GROUP_CATEGORIES } from "@/app/constants/exercises";

// ─── Local draft type ─────────────────────────────────────────────────────────

type DraftExercise = {
  id: string;
  name: string;
  muscleGroups: string[];
  sets: number;
  targetReps: number;
  restSeconds: number;
  startWeight: string;
  notes: string;
};

type Mode = "list" | "build" | "pick";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const REST_STEPS = [30, 45, 60, 90, 120, 150, 180, 240, 300];

function formatRest(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m${r}s`;
}

function stepRest(current: number, dir: 1 | -1): number {
  const idx = REST_STEPS.indexOf(current);
  if (idx !== -1) {
    return REST_STEPS[Math.max(0, Math.min(REST_STEPS.length - 1, idx + dir))];
  }
  const nearest = REST_STEPS.reduce((p, c) =>
    Math.abs(c - current) < Math.abs(p - current) ? c : p
  );
  const ni = REST_STEPS.indexOf(nearest);
  return REST_STEPS[Math.max(0, Math.min(REST_STEPS.length - 1, ni + dir))];
}

function tplToDraft(ex: TemplateExercise): DraftExercise {
  return {
    id:          uid(),
    name:        ex.name,
    muscleGroups:ex.muscleGroups,
    sets:        ex.sets        ?? 3,
    targetReps:  ex.targetReps  ?? 8,
    restSeconds: ex.restSeconds ?? 90,
    startWeight: ex.startWeight ?? "",
    notes:       ex.notes       ?? "",
  };
}

// ─── Stepper sub-component ────────────────────────────────────────────────────

function Stepper({
  label, value, onDec, onInc, format,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onDec}
          className="w-7 h-7 rounded-lg bg-zinc-700/60 hover:bg-zinc-600/70 text-zinc-300 text-sm font-bold flex items-center justify-center transition-colors active:scale-95">
          −
        </button>
        <span className="text-sm font-bold text-white tabular-nums min-w-[2.75rem] text-center">
          {format ? format(value) : value}
        </span>
        <button type="button" onClick={onInc}
          className="w-7 h-7 rounded-lg bg-zinc-700/60 hover:bg-zinc-600/70 text-zinc-300 text-sm font-bold flex items-center justify-center transition-colors active:scale-95">
          +
        </button>
      </div>
    </div>
  );
}

// ─── Exercise config card ─────────────────────────────────────────────────────

function ExerciseConfigCard({
  ex, isFirst, isLast, onChange, onMove, onDelete, onChangeExercise,
}: {
  ex: DraftExercise;
  isFirst: boolean;
  isLast: boolean;
  onChange: (updated: DraftExercise) => void;
  onMove: (dir: 1 | -1) => void;
  onDelete: () => void;
  onChangeExercise: () => void;
}) {
  const update = (patch: Partial<DraftExercise>) => onChange({ ...ex, ...patch });

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-2xl p-4">
      <div className="flex items-start gap-2 mb-3">
        <button type="button" onClick={onChangeExercise} className="flex-1 text-left min-w-0 group">
          <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">
            {ex.name}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {ex.muscleGroups.join(" · ")}
            <span className="text-zinc-700"> · tap to change</span>
          </p>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => onMove(-1)} disabled={isFirst}
            className="w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center text-xs transition-colors">
            ↑
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={isLast}
            className="w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 disabled:opacity-20 disabled:pointer-events-none flex items-center justify-center text-xs transition-colors">
            ↓
          </button>
          <button type="button" onClick={onDelete}
            className="w-7 h-7 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs transition-colors ml-1">
            ✕
          </button>
        </div>
      </div>

      <div className="flex items-start gap-0 mb-3">
        <Stepper label="Sets"
          value={ex.sets}
          onDec={() => update({ sets: Math.max(1, ex.sets - 1) })}
          onInc={() => update({ sets: Math.min(10, ex.sets + 1) })}
        />
        <div className="w-px self-stretch bg-zinc-700/40 mx-1" />
        <Stepper label="Target Reps"
          value={ex.targetReps}
          onDec={() => update({ targetReps: Math.max(1, ex.targetReps - 1) })}
          onInc={() => update({ targetReps: Math.min(30, ex.targetReps + 1) })}
        />
        <div className="w-px self-stretch bg-zinc-700/40 mx-1" />
        <Stepper label="Rest"
          value={ex.restSeconds}
          onDec={() => update({ restSeconds: stepRest(ex.restSeconds, -1) })}
          onInc={() => update({ restSeconds: stepRest(ex.restSeconds, 1) })}
          format={formatRest}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Start kg</p>
          <input type="number" value={ex.startWeight} onChange={(e) => update({ startWeight: e.target.value })}
            placeholder="—" min="0" step="0.5"
            className="w-16 bg-zinc-900/60 border border-zinc-700/30 rounded-xl px-2 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors text-center tabular-nums"
          />
        </div>
        <input type="text" value={ex.notes} onChange={(e) => update({ notes: e.target.value })}
          placeholder="Notes (optional)…" maxLength={80}
          className="flex-1 bg-zinc-900/60 border border-zinc-700/30 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>
    </div>
  );
}

// ─── Template card (shared between Presets and My Templates) ──────────────────

function TemplateCard({
  template,
  isPreset,
  onStart,
  onCustomize,
  onDelete,
}: {
  template: WorkoutTemplate;
  isPreset: boolean;
  onStart: () => void;
  onCustomize?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <p className="font-bold text-white text-sm leading-snug truncate">{template.name}</p>
          {isPreset && (
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-semibold mt-0.5">
              Built-in
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onCustomize && (
            <button onClick={onCustomize}
              className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 transition-colors">
              Customize
            </button>
          )}
          <button onClick={onStart}
            className="text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-full transition-colors">
            Start →
          </button>
          {!isPreset && onDelete && (
            <button onClick={onDelete}
              className="text-zinc-600 hover:text-zinc-400 w-6 h-6 flex items-center justify-center transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {template.exercises.map((e) => (
          <div key={e.name} className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-zinc-400 truncate">{e.name}</p>
            {e.sets != null && e.targetReps != null && (
              <p className="text-[11px] text-zinc-600 shrink-0 tabular-nums">
                {e.sets}×{e.targetReps}
                {e.restSeconds != null && ` · ${formatRest(e.restSeconds)}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  presets: WorkoutTemplate[];
  templates: WorkoutTemplate[];
  userExercises: LibraryExercise[];
  onStart: (template: WorkoutTemplate) => void;
  onSave: (name: string, exercises: TemplateExercise[]) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onCreateCustom: (name: string, muscleGroups: string[], equipment?: Equipment) => Promise<LibraryExercise>;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function TemplatesSheet({
  presets,
  templates,
  userExercises,
  onStart,
  onSave,
  onDelete,
  onClose,
  onCreateCustom,
}: Props) {
  const [mode, setMode]                     = useState<Mode>("list");
  const [newName, setNewName]               = useState("");
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [pickTarget, setPickTarget]         = useState<"new" | string>("new");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeEquipment, setActiveEquipment] = useState("All");
  const [search, setSearch]                 = useState("");

  // ── Custom exercise creation state (scoped to pick mode) ──
  const [pickTab, setPickTab]               = useState<"library" | "custom">("library");
  const [customName, setCustomName]         = useState("");
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | undefined>(undefined);
  const [saving, setSaving]                 = useState(false);
  const [saveError, setSaveError]           = useState<string | null>(null);

  // ── Navigation helpers ──

  const startBuild = () => {
    setNewName("");
    setDraftExercises([]);
    setMode("build");
  };

  const startBuildFromPreset = (preset: WorkoutTemplate) => {
    setNewName(preset.name);
    setDraftExercises(preset.exercises.map(tplToDraft));
    setMode("build");
  };

  const resetToList = () => {
    setMode("list");
    setNewName("");
    setDraftExercises([]);
  };

  const openPicker = (target: "new" | string) => {
    setPickTarget(target);
    setActiveCategory("All");
    setSearch("");
    setPickTab("library");
    setCustomName("");
    setSelectedMuscles([]);
    setSaving(false);
    setSaveError(null);
    setMode("pick");
  };

  // ── Draft mutations ──

  const handlePickExercise = (name: string, muscleGroups: string[]) => {
    if (pickTarget === "new") {
      setDraftExercises((prev) => [
        ...prev,
        { id: uid(), name, muscleGroups, sets: 3, targetReps: 8, restSeconds: 90, startWeight: "", notes: "" },
      ]);
    } else {
      setDraftExercises((prev) =>
        prev.map((e) => (e.id === pickTarget ? { ...e, name, muscleGroups } : e))
      );
    }
    setMode("build");
  };

  const updateExercise = (id: string, updated: DraftExercise) =>
    setDraftExercises((prev) => prev.map((e) => (e.id === id ? updated : e)));

  const moveExercise = (index: number, dir: 1 | -1) =>
    setDraftExercises((prev) => {
      const next   = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const deleteExercise = (id: string) =>
    setDraftExercises((prev) => prev.filter((e) => e.id !== id));

  // ── Custom exercise creation ──

  const toggleMuscle = (muscle: string) =>
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );

  const handleCreateCustom = async () => {
    const name = customName.trim();
    if (!name || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const exercise = await onCreateCustom(name, selectedMuscles, selectedEquipment);
      handlePickExercise(exercise.name, exercise.muscleGroups);
    } catch (e) {
      const msg = e instanceof Error && e.message === "DUPLICATE_EXERCISE"
        ? "An exercise with this name already exists."
        : "Could not save exercise. Please try again.";
      setSaveError(msg);
      setSaving(false);
    }
  };

  // ── Save ──

  const handleSave = () => {
    if (!newName.trim() || draftExercises.length === 0) return;
    const exercises: TemplateExercise[] = draftExercises.map((e) => ({
      name:         e.name,
      muscleGroups: e.muscleGroups,
      sets:         e.sets,
      targetReps:   e.targetReps,
      restSeconds:  e.restSeconds,
      startWeight:  e.startWeight.trim() || undefined,
      notes:        e.notes.trim() || undefined,
    }));
    onSave(newName.trim(), exercises);
    resetToList();
  };

  // ── Exercise picker filter ──

  // 1. Merge + category filter
  const categoryFiltered = (() => {
    const builtInNames = new Set(LIBRARY.map((e) => e.name.toLowerCase()));
    const customOnly = userExercises.filter((e) => !builtInNames.has(e.name.toLowerCase()));
    const merged = [...LIBRARY, ...customOnly];
    if (activeCategory === "All") return merged;
    const cat = MUSCLE_GROUP_CATEGORIES.find((c) => c.label === activeCategory);
    if (!cat) return merged;
    return merged.filter((ex) => ex.muscleGroups.length === 0 || ex.muscleGroups.some((m) => cat.muscles.includes(m)));
  })();

  // 2. Derive available equipment chips from category-filtered built-ins (exercises with equipment set)
  const equipmentOptions: string[] = (() => {
    const seen = new Set<string>();
    for (const ex of categoryFiltered) {
      if (ex.equipment) seen.add(ex.equipment);
    }
    return Array.from(seen);
  })();

  // 3. Equipment + search filter
  const filteredExercises = (() => {
    let list = categoryFiltered;
    if (activeEquipment !== "All") {
      // User exercises (equipment === undefined) always pass — they carry no equipment metadata
      list = list.filter((ex) => ex.equipment === undefined || ex.equipment === activeEquipment);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ex) => ex.name.toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl shadow-2xl">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-zinc-800">
          {mode !== "list" ? (
            <button
              onClick={mode === "pick" ? () => setMode("build") : resetToList}
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← Back
            </button>
          ) : (
            <h2 className="text-base font-black text-white">Templates</h2>
          )}

          <div className="flex items-center gap-2">
            {mode === "build" && draftExercises.length > 0 && (
              <span className="text-[11px] text-zinc-600">
                {draftExercises.length} exercise{draftExercises.length !== 1 ? "s" : ""}
              </span>
            )}
            {mode === "pick" && (
              <span className="text-[11px] font-semibold text-zinc-500">
                {pickTarget === "new" ? "Add Exercise" : "Change Exercise"}
              </span>
            )}
            <button
              onClick={mode === "list" ? onClose : mode === "pick" ? () => setMode("build") : resetToList}
              className="text-zinc-500 hover:text-zinc-300 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── LIST ── */}
        {mode === "list" && (
          <div className="px-5 pt-4 pb-8 max-h-[75vh] overflow-y-auto space-y-6">

            {/* My Templates section — only rendered when templates exist */}
            {templates.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">
                  My Templates
                </p>
                <div className="space-y-3">
                  {templates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      isPreset={false}
                      onStart={() => onStart(t)}
                      onCustomize={() => startBuildFromPreset(t)}
                      onDelete={() => onDelete(t.id)}
                    />
                  ))}
                </div>
                <button
                  onClick={startBuild}
                  className="mt-3 w-full py-3 border border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-600 hover:text-zinc-400 rounded-2xl text-sm font-semibold transition-colors"
                >
                  + New Template from scratch
                </button>
              </section>
            )}

            {/* Preset Templates section — always visible */}
            <section>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">
                Preset Templates
              </p>
              {templates.length === 0 && (
                <p className="text-[11px] text-zinc-700 mb-3">
                  No templates yet — start with one below
                </p>
              )}
              <div className="space-y-3">
                {presets.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isPreset
                    onStart={() => onStart(t)}
                    onCustomize={() => startBuildFromPreset(t)}
                  />
                ))}
              </div>
              {templates.length === 0 && (
                <button
                  onClick={startBuild}
                  className="mt-3 w-full py-3 border border-dashed border-zinc-700 hover:border-zinc-600 text-zinc-600 hover:text-zinc-400 rounded-2xl text-sm font-semibold transition-colors"
                >
                  + New Template from scratch
                </button>
              )}
            </section>

          </div>
        )}

        {/* ── BUILD ── */}
        {mode === "build" && (
          <div className="px-5 pt-4 pb-8 max-h-[78vh] overflow-y-auto">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Template name…"
              autoFocus
              maxLength={40}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors mb-4"
            />

            {draftExercises.length > 0 && (
              <div className="space-y-3 mb-3">
                {draftExercises.map((ex, i) => (
                  <ExerciseConfigCard
                    key={ex.id}
                    ex={ex}
                    isFirst={i === 0}
                    isLast={i === draftExercises.length - 1}
                    onChange={(updated) => updateExercise(ex.id, updated)}
                    onMove={(dir) => moveExercise(i, dir)}
                    onDelete={() => deleteExercise(ex.id)}
                    onChangeExercise={() => openPicker(ex.id)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => openPicker("new")}
              className="w-full py-3 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 rounded-2xl text-sm font-semibold transition-colors mb-4"
            >
              + Add Exercise
            </button>

            <button
              onClick={handleSave}
              disabled={!newName.trim() || draftExercises.length === 0}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm transition-colors"
            >
              Save Template
            </button>
          </div>
        )}

        {/* ── PICK ── */}
        {mode === "pick" && (
          <div className="max-h-[70vh] overflow-y-auto">

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {(["library", "custom"] as const).map((t) => (
                <button key={t} onClick={() => setPickTab(t)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${pickTab === t ? "text-red-500 border-b-2 border-red-500" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {t === "library" ? "Library" : "Custom"}
                </button>
              ))}
            </div>

            {pickTab === "library" ? (
              <div className="px-5 pt-4 pb-8">
                {/* Search */}
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercises…"
                  className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors mb-3"
                />

                {/* Category + equipment pills */}
                {!search.trim() && (
                  <div className="space-y-1.5 mb-3">
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {["All", ...MUSCLE_GROUP_CATEGORIES.map((c) => c.label)].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => { setActiveCategory(cat); setActiveEquipment("All"); }}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            activeCategory === cat
                              ? "bg-red-600 text-white"
                              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {equipmentOptions.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                        {["All", ...equipmentOptions].map((eq) => (
                          <button
                            key={eq}
                            onClick={() => setActiveEquipment(eq)}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                              activeEquipment === eq
                                ? "bg-zinc-600 text-white"
                                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            {eq}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Exercise list */}
                <div className="relative">
                  <div className="space-y-0.5">
                    {filteredExercises.length === 0 ? (
                      <p className="text-zinc-600 text-sm text-center py-6">No exercises found.</p>
                    ) : (
                      filteredExercises.map((ex) => (
                        <button
                          key={ex.name}
                          onClick={() => handlePickExercise(ex.name, ex.muscleGroups)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
                        >
                          <div className="text-left min-w-0">
                            <p className="text-sm font-semibold text-zinc-100 truncate">{ex.name}</p>
                            <p className="text-[11px] text-zinc-500">
                              {ex.muscleGroups.join(" · ")}
                              {ex.equipment && (
                                <span className="text-zinc-700 ml-1.5">· {ex.equipment}</span>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 ml-3 text-zinc-700 font-black text-base">+</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent" />
                </div>
              </div>
            ) : (
              <div className="px-5 pt-4 pb-8 space-y-4">
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
                <div>
                  <label className="block text-xs text-zinc-500 font-medium mb-2">Equipment <span className="text-zinc-600">(optional)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {(["Barbell", "Dumbbell", "Kettlebell", "EZ Bar", "Machine", "Cable", "Smith", "Bodyweight"] as Equipment[]).map((eq) => (
                      <button key={eq} type="button"
                        onClick={() => setSelectedEquipment((prev) => prev === eq ? undefined : eq)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedEquipment === eq ? "bg-zinc-600 border-zinc-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"}`}>
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>
                {saveError && (
                  <p className="text-xs text-red-400 font-medium">{saveError}</p>
                )}
                <button
                  onClick={handleCreateCustom}
                  disabled={!customName.trim() || saving}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm transition-colors"
                >
                  {saving ? "Saving…" : "Add Exercise"}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
