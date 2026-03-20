"use client";

import { useState } from "react";
import type { WorkoutTemplate, TemplateExercise } from "@/app/types";

const KEY = "ap_templates";
const uid = () => Math.random().toString(36).slice(2, 9);

export function useTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(KEY);
    return stored ? (JSON.parse(stored) as WorkoutTemplate[]) : [];
  });

  const persist = (updated: WorkoutTemplate[]) => {
    localStorage.setItem(KEY, JSON.stringify(updated));
    setTemplates(updated);
  };

  const saveTemplate = (name: string, exercises: TemplateExercise[]) => {
    persist([...templates, { id: uid(), name, exercises, createdAt: Date.now() }]);
  };

  const deleteTemplate = (id: string) => {
    persist(templates.filter((t) => t.id !== id));
  };

  return { templates, saveTemplate, deleteTemplate };
}
