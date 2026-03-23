"use client";

import { useState } from "react";
import type { TrainingPlan, TrainingDay, WorkoutTemplate } from "@/app/types";
import { PRESET_TEMPLATES } from "@/app/constants/presetTemplates";
import { Plus, X } from "lucide-react";

const uid = () => crypto.randomUUID();

interface Props {
  plan: TrainingPlan | null;
  templates: WorkoutTemplate[];
  days: TrainingDay[];
  onDaysChange: (days: TrainingDay[]) => void;
  onSave: (plan: TrainingPlan) => void;
  onClear: () => void;
  onClose: () => void;
  onCreateTemplate: (dayId: string) => void;
}

export default function TrainingPlanSheet({
  plan,
  templates,
  days,
  onDaysChange,
  onSave,
  onClear,
  onClose,
  onCreateTemplate,
}: Props) {
  // Lazy init — this sheet is always mounted fresh, no external sync needed
  const [name, setName] = useState(() => plan?.name ?? "My Plan");

  const allTemplates: WorkoutTemplate[] = [...PRESET_TEMPLATES, ...templates];

  const addDay = () =>
    onDaysChange([
      ...days,
      { id: uid(), dayNumber: days.length + 1, templateId: undefined },
    ]);

  const removeDay = (id: string) => {
    const filtered = days.filter((d) => d.id !== id);
    onDaysChange(filtered.map((d, i) => ({ ...d, dayNumber: i + 1 })));
  };

  const updateTemplate = (id: string, templateId: string) => {
    onDaysChange(
      days.map((d) =>
        d.id === id ? { ...d, templateId: templateId || undefined } : d
      )
    );
  };

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

          {/* Column headers */}
          {days.length > 0 && (
            <div className="flex items-center gap-2 px-0.5">
              <span className="w-8 shrink-0" />
              <span className="flex-1 text-[10px] uppercase tracking-widest text-zinc-700">Template</span>
              {/* spacers for + and × buttons */}
              <span className="w-6 shrink-0" />
              <span className="w-6 shrink-0" />
            </div>
          )}

          {/* Empty state */}
          {days.length === 0 && (
            <p className="text-sm text-zinc-700 text-center py-4">
              No days yet. Add your first day below.
            </p>
          )}

          {/* Day rows */}
          {days.map((day) => (
            <div key={day.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500 w-8 shrink-0 text-center">
                D{day.dayNumber}
              </span>

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

              {/* Create new template — enters template creation sub-flow */}
              <button
                onClick={() => onCreateTemplate(day.id)}
                title="Create new template"
                className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
              >
                <Plus size={15} />
              </button>

              <button
                onClick={() => removeDay(day.id)}
                className="w-6 h-6 flex items-center justify-center text-zinc-700 hover:text-red-500 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={addDay}
            className="w-full py-3 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl text-sm text-zinc-600 hover:text-zinc-400 font-semibold transition-colors"
          >
            <span className="inline-flex items-center gap-1"><Plus size={13} /> Add Day</span>
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
