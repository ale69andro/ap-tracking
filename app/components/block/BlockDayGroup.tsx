import type { BlockDayGroup as BlockDayGroupData } from "@/app/types";
import BlockExerciseRow from "./BlockExerciseRow";

type Props = { group: BlockDayGroupData };

/** One training day (template) with its exercise series. */
export default function BlockDayGroup({ group }: Props) {
  const hasLateSeries = group.rows.some((row) => row.entries[0].weekIndex > 1);

  return (
    <section className="mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-black text-white truncate">{group.label}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {group.rows.length} {group.rows.length === 1 ? "Übung" : "Übungen"} · e1RM gegen Startwert
        </p>
      </div>
      <div className="divide-y divide-zinc-800/70">
        {group.rows.map((row) => (
          <BlockExerciseRow key={row.key} row={row} />
        ))}
      </div>
      {hasLateSeries && (
        <p className="px-4 py-3 text-xs text-zinc-500 border-t border-zinc-800/70">
          Neue oder umbenannte Übungen werden als eigene Reihe mit eigenem Startwert geführt.
        </p>
      )}
    </section>
  );
}
