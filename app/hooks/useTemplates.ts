"use client";

import { useState, useEffect, useRef } from "react";
import type { WorkoutTemplate, TemplateExercise } from "@/app/types";
import { createClient } from "@/lib/supabase/client";

const LOCAL_KEY = "ap_templates";

// ─── Supabase row mappers ─────────────────────────────────────────────────────

type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  exercises: TemplateExercise[];
  created_at: string;
};

function rowToTemplate(row: TemplateRow): WorkoutTemplate {
  return {
    id:        row.id,
    name:      row.name,
    exercises: row.exercises ?? [],
    createdAt: new Date(row.created_at).getTime(),
  };
}

function templateToRow(template: WorkoutTemplate, userId: string) {
  return {
    id:       template.id,
    user_id:  userId,
    name:     template.name,
    exercises: template.exercises,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTemplates(userId: string | null) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  // Guard: only attempt localStorage migration once per mount.
  const migrationAttempted = useRef(false);

  useEffect(() => {
    if (!userId) return;
    // State is gated on userId in the return value below.

    const supabase = createClient();
    supabase
      .from("workout_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then(async ({ data, error }) => {
        if (error) { console.error("Failed to load templates:", error); return; }

        const remote = (data as TemplateRow[] ?? []).map(rowToTemplate);

        // ── localStorage migration ────────────────────────────────────────
        // On first login, if the user has no remote templates but has local
        // ones (from the pre-auth era), import them into Supabase once.
        if (remote.length === 0 && !migrationAttempted.current) {
          migrationAttempted.current = true;
          try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (raw) {
              const local = JSON.parse(raw) as WorkoutTemplate[];
              if (local.length > 0) {
                const rows = local.map((t) => templateToRow(t, userId));
                const { data: inserted, error: insertError } = await supabase
                  .from("workout_templates")
                  .insert(rows)
                  .select();

                if (!insertError && inserted) {
                  setTemplates((inserted as TemplateRow[]).map(rowToTemplate));
                  // Clear the local copy so migration doesn't re-run
                  localStorage.removeItem(LOCAL_KEY);
                  return;
                }
              }
            }
          } catch {
            // Migration is best-effort; failure is non-fatal.
          }
        }

        setTemplates(remote);
      });
  }, [userId]);

  const saveTemplate = async (name: string, exercises: TemplateExercise[]): Promise<WorkoutTemplate | null> => {
    if (!userId) return null;
    const supabase = createClient();
    const newTemplate: WorkoutTemplate = {
      id:        crypto.randomUUID(),
      name,
      exercises,
      createdAt: Date.now(),
    };
    const { error } = await supabase
      .from("workout_templates")
      .insert(templateToRow(newTemplate, userId));

    if (error) { console.error("Failed to save template:", error); return null; }
    setTemplates((prev) => [...prev, newTemplate]);
    return newTemplate;
  };

  const deleteTemplate = async (id: string) => {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("workout_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // belt-and-suspenders alongside RLS

    if (error) { console.error("Failed to delete template:", error); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTemplate = async (id: string, exercises: TemplateExercise[]): Promise<void> => {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("workout_templates")
      .update({ exercises })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) { console.error("Failed to update template:", error); throw error; }
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exercises } : t))
    );
  };

  return {
    // Gate on userId so stale state from a previous session is never exposed.
    templates: userId ? templates : [],
    saveTemplate,
    deleteTemplate,
    updateTemplate,
  };
}
