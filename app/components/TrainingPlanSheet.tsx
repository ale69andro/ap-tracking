"use client";

import { useState } from "react";
import type { TrainingPlan, TrainingDay, WorkoutTemplate } from "@/app/types";
import { PRESET_TEMPLATES } from "@/app/constants/presetTemplates";

const uid = () => crypto.randomUUID();

interface Props {
  plan: TrainingPlan | null;
  templates: WorkoutTemplate[];
  onSave: (plan: TrainingPlan) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function TrainingPlanSheet({ plan, templates, onSave, onClear, onClose }: Props) {
  // Lazy init — this sheet is always mounted fresh, no external sync needed
  const [name, setName] = useState(() => plan?.name ?? "My Plan");
  const [days, setDays] = useState<TrainingDay[]>(() => plan?.days ?? []);

  const allTemplates: WorkoutTemplate[] = [...PRESET_TEMPLATES, ...templates];

  const addDay = () =>
    setDays((prev) => [
      ...prev,
      { id: uid(), dayNumber: prev.length + 1, label: "", templateId: undefined },
    ]);

  const removeDay = (id: string) =>
    setDays((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      return filtered.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });

  const updateLabel = (id: string, value: string) =>
    setDays((prev) =>
      prev.map((d) => (d.id === id ? { ...d, label: value || undefined } : d))
    );

  const updateTemplate = (id: string, templateId: string) =>
    setDays((prev) =>
      prev.map((d) => (d.id === id ? { ...d, templateId: templateId || undefined } : d))
    );

  const handleSave = () => {
    if (days.length === 0) return;
    onSave({
      id: plan?.id ?? uid(),
      name: name.trim() || "My Plan",
      days,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-900 shrink-0">
          <h2 className="text-base font-black text-white">Training Plan</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">

          {/* Plan name */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Plan name"
            maxLength={40}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
          />

          {/* Column labels */}
          {days.length > 0 && (
            <div className="flex items-center gap-2 px-0.5">
              <span className="w-8 shrink-0" />
              <span className="flex-1 text-[10px] uppercase tracking-widest text-zinc-700">Label</span>
              <span className="flex-1 text-[10px] uppercase tracking-widest text-zinc-700">Template</span>
              <span className="w-6 shrink-0" />
            </div>
          )}

          {/* Days */}
          {days.length === 0 && (
            <p className="text-sm text-zinc-700 text-center py-4">
              No days yet. Add your first day below.
            </p>
          )}

          {days.map((day) => (
            <div key={day.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 w-8 shrink-0 text-center">
                D{day.dayNumber}
              </span>
              <input
                value={day.label ?? ""}
                onChange={(e) => updateLabel(day.id, e.target.value)}
                placeholder="Push / Pull…"
                maxLength={20}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
              />
              <select
                value={day.templateId ?? ""}
                onChange={(e) => updateTemplate(day.id, e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none focus:border-zinc-600 transition-colors"
              >
                <option value="">No template</option>
                {allTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeDay(day.id)}
                className="w-6 text-zinc-700 hover:text-red-500 transition-colors text-base font-black shrink-0 text-center"
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={addDay}
            className="w-full py-3 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl text-sm text-zinc-600 hover:text-zinc-400 font-semibold transition-colors"
          >
            + Add Day
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 space-y-2 border-t border-zinc-900 shrink-0">
          <button
            onClick={handleSave}
            disabled={days.length === 0}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-widest uppercase transition-colors"
          >
            Save Plan
          </button>
          {plan && (
            <button
              onClick={() => { onClear(); onClose(); }}
              className="w-full py-3 text-zinc-600 hover:text-zinc-400 text-sm font-semibold transition-colors"
            >
              Clear Plan
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
